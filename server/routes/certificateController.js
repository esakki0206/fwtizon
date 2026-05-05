import Certificate from '../models/Certificate.js';
import Receipt from '../models/Receipt.js';
import Enrollment from '../models/Enrollment.js';
import Counter from '../models/Counter.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import FeedbackForm from '../models/FeedbackForm.js';
import { generateCertificatePDF } from '../utils/generateCertificatePDF.js';
import { uploadPdfToCloudinary } from '../utils/uploadPdfToCloudinary.js';
import { v2 as cloudinary } from 'cloudinary';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sanitizePdfFilename = (value, fallback) => {
  const safeValue = String(value || fallback || 'document')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safeValue || fallback || 'document';
};

const buildCertificateLinks = (certificateId) => ({
  viewUrl: `/api/certificates/${certificateId}/view`,
  downloadUrl: `/api/certificates/${certificateId}/download`,
});

const buildReceiptLinks = (receiptId) => ({
  viewUrl: `/api/receipts/${receiptId}/view`,
  downloadUrl: `/api/receipts/${receiptId}/download`,
});

const mapCertificateDocument = (certificate) => {
  const data = certificate.toObject ? certificate.toObject() : certificate;
  return { ...data, ...buildCertificateLinks(data.certificateId) };
};

const mapReceiptDocument = (receipt) => {
  const data = receipt.toObject ? receipt.toObject() : receipt;
  return { ...data, ...buildReceiptLinks(data.receiptId) };
};

const getPublicIdFromUrl = (url) => {
  const parts = url.split('/upload/');
  if (parts.length !== 2) return null;
  let path = parts[1].replace(/^v\d+\//, '');
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex !== -1) path = path.substring(0, dotIndex);
  return path;
};

const sendCloudinaryPdf = async (res, fileUrl, { filename, disposition }) => {
  if (!fileUrl) throw new Error('No file URL stored for this document');

  let fetchUrl = fileUrl;
  try {
    const publicId = getPublicIdFromUrl(fileUrl);
    if (publicId) {
      fetchUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
        resource_type: 'image', type: 'upload',
      });
    }
  } catch (err) {
    console.error('Failed to generate signed URL, falling back:', err);
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Cloudinary returned ${response.status} for PDF asset`);
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(pdfBuffer.length));
  res.setHeader('Content-Disposition', `${disposition}; filename="${sanitizePdfFilename(filename, 'document.pdf')}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.status(200).send(pdfBuffer);
};

// ─── Template Resolution ──────────────────────────────────────────────────────

/**
 * Resolve which CertificateTemplate to use.
 * Priority: explicit templateId → default active template → null (legacy)
 */
export const resolveTemplate = async (templateId = null) => {
  if (templateId) {
    const t = await CertificateTemplate.findById(templateId);
    if (t && t.isActive) return t;
  }
  // Fall back to default template
  const def = await CertificateTemplate.findOne({ isDefault: true, isActive: true });
  return def || null;
};

// ─── Certificate Generation Core ─────────────────────────────────────────────

const getCertificateCourseId = (certificate, field) => {
  const value = certificate?.[field];
  if (!value) return null;
  return value._id || value;
};

const getFeedbackTemplateForCertificate = async (certificate) => {
  const filters = [];
  const liveCourseId = getCertificateCourseId(certificate, 'liveCourse');
  const courseId = getCertificateCourseId(certificate, 'course');

  if (liveCourseId) filters.push({ liveCourse: liveCourseId });
  if (courseId) filters.push({ course: courseId });
  if (!filters.length) return null;

  const form = await FeedbackForm.findOne({
    $or: filters,
    isActive: true,
    certificateTemplate: { $ne: null },
  })
    .select('certificateTemplate availableCertificateTypes')
    .populate('certificateTemplate');

  if (!form?.certificateTemplate?.isActive) return null;

  const certificateType = Array.isArray(form.availableCertificateTypes) && form.availableCertificateTypes[0]
    ? form.availableCertificateTypes[0]
    : certificate.certificateType || 'Completion Certificate';

  return { template: form.certificateTemplate, certificateType };
};

const shouldRefreshCertificatePdf = (certificate, template, certificateType) => {
  if (!template?._id) return false;

  const currentTemplateId = certificate.templateId ? certificate.templateId.toString() : null;
  const targetTemplateId = template._id.toString();

  if (currentTemplateId !== targetTemplateId) return true;
  if ((certificate.certificateType || 'Completion Certificate') !== certificateType) return true;
  if (!certificate.fileUrl) return true;
  if (!certificate.templateRenderedAt) return true;

  const templateUpdatedAt = template.updatedAt ? new Date(template.updatedAt).getTime() : 0;
  const renderedAt = new Date(certificate.templateRenderedAt).getTime();
  return templateUpdatedAt > renderedAt;
};

const refreshCertificatePdf = async (certificate, template, certificateType) => {
  const pdfBuffer = await generateCertificatePDF({
    studentName: certificate.studentName,
    courseName: certificate.courseName,
    domain: certificate.domain || certificate.course?.category || certificate.liveCourse?.category || 'Professional Development',
    areaOfExpertise: certificate.areaOfExpertise || 'Specialized Training',
    completionDate: certificate.completionDate || certificate.issueDate || new Date(),
    certificateId: certificate.certificateId,
    serialNumber: certificate.serialNumber || parseInt(String(certificate.certificateId).split('-').pop(), 10) || 1,
    instructorName: certificate.course?.instructorName || certificate.liveCourse?.instructorName || '',
  }, template);

  certificate.fileUrl = await uploadPdfToCloudinary(
    pdfBuffer,
    `${certificate.certificateId}-${certificate.user}-feedback-template-${Date.now()}`,
    'fwtion/certificates'
  );
  certificate.templateId = template._id;
  certificate.templateName = template.templateName;
  certificate.templateRenderedAt = new Date();
  certificate.certificateType = certificateType;
  await certificate.save({ validateBeforeSave: false });

  return certificate;
};

const ensureFeedbackTemplateCertificatePdf = async (certificate) => {
  const feedbackTemplate = await getFeedbackTemplateForCertificate(certificate);
  if (!feedbackTemplate) return certificate;

  const { template, certificateType } = feedbackTemplate;
  if (!shouldRefreshCertificatePdf(certificate, template, certificateType)) return certificate;

  return refreshCertificatePdf(certificate, template, certificateType);
};

export const buildAndStoreCertificate = async ({
  userId, userEmail, userName, courseRef, courseType, courseId,
  enrollmentId, completionDate, templateId, certificateType,
}) => {
  const serialNumber = await Counter.getNextSequence('certificates');
  const paddedSerial = String(serialNumber).padStart(4, '0');
  const currentYear  = new Date().getFullYear();
  const certificateId = `FWT-IZON-${currentYear}-${paddedSerial}`;

  const template = await resolveTemplate(templateId);

  const pdfData = {
    studentName: userName,
    courseName: courseRef.title,
    domain: courseRef.category || 'Professional Development',
    areaOfExpertise: 'Specialized Training',
    completionDate: completionDate || new Date(),
    certificateId,
    serialNumber,
    instructorName: courseRef.instructorName || '',
  };

  const pdfBuffer = await generateCertificatePDF(pdfData, template);
  const fileUrl   = await uploadPdfToCloudinary(
    pdfBuffer,
    `${certificateId}-${userId}`,
    'fwtion/certificates'
  );

  const cert = await Certificate.create({
    certificateId,
    user: userId,
    [courseType]: courseId,
    studentName: userName,
    studentEmail: userEmail,
    courseName: courseRef.title,
    domain: pdfData.domain,
    areaOfExpertise: pdfData.areaOfExpertise,
    issueDate: new Date(),
    completionDate: pdfData.completionDate,
    certificateType: certificateType || 'Completion Certificate',
    serialNumber,
    fileUrl,
    enrollment: enrollmentId,
    templateId: template?._id || null,
    templateName: template?.templateName || 'Legacy Template',
    templateRenderedAt: template ? new Date() : null,
  });

  return cert;
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT CERTIFICATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Generate a new certificate for a completed enrollment
 * @route   POST /api/certificates/generate
 * @access  Private
 */
export const generateCertificate = async (req, res) => {
  try {
    const { enrollmentId, templateId } = req.body;

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('course')
      .populate('liveCourse');

    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.user.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (enrollment.status !== 'completed') return res.status(400).json({ success: false, message: 'Course is not completed yet.' });

    const courseType = enrollment.course ? 'course' : 'liveCourse';
    const courseId   = enrollment[courseType]._id;

    const existingCert = await Certificate.findOne({ user: req.user.id, [courseType]: courseId });
    if (existingCert) {
      return res.status(400).json({
        success: false, message: 'Certificate already generated', data: mapCertificateDocument(existingCert),
      });
    }

    const cert = await buildAndStoreCertificate({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      courseRef: enrollment[courseType],
      courseType,
      courseId,
      enrollmentId: enrollment._id,
      completionDate: enrollment.completedAt || new Date(),
      templateId,
    });

    enrollment.certificateId = cert.certificateId;
    await enrollment.save({ validateBeforeSave: false });

    res.status(201).json({ success: true, data: mapCertificateDocument(cert) });
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate certificate' });
  }
};

/**
 * @desc    Get all certificates for the logged-in student
 * @route   GET /api/certificates/my
 * @access  Private
 */
export const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ user: req.user.id })
      .populate('course', 'title thumbnail category')
      .populate('liveCourse', 'title thumbnail category')
      .sort('-issueDate');

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates.map(mapCertificateDocument),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get certificates for any user (admin or self)
 * @route   GET /api/certificates/user/:userId
 * @access  Private
 */
export const getCertificatesByUserId = async (req, res) => {
  try {
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view these certificates' });
    }

    const certificates = await Certificate.find({ user: req.params.userId })
      .populate('course', 'title thumbnail category')
      .populate('liveCourse', 'title thumbnail category')
      .sort('-issueDate');

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates.map(mapCertificateDocument),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get a single certificate (public — for verification page)
 * @route   GET /api/certificates/:certificateId
 * @access  Public
 */
export const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate('user', 'name avatar')
      .populate('course', 'title thumbnail category')
      .populate('liveCourse', 'title thumbnail category');

    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });

    res.status(200).json({ success: true, data: mapCertificateDocument(certificate) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    View or download a certificate PDF
 * @route   GET /api/certificates/:certificateId/view|download
 * @access  Public
 */
export const serveCertificatePDF = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate('course', 'category instructorName')
      .populate('liveCourse', 'category instructorName');

    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });

    const certificateToServe = await ensureFeedbackTemplateCertificatePdf(certificate);
    const disposition = req.path.endsWith('/download') ? 'attachment' : 'inline';
    await sendCloudinaryPdf(res, certificateToServe.fileUrl, {
      filename: `${certificateToServe.certificateId}.pdf`,
      disposition,
    });
  } catch (error) {
    console.error('Serve certificate PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to serve certificate PDF' });
  }
};

/**
 * @desc    Public certificate verification endpoint
 * @route   GET /api/verify-certificate/:id
 * @access  Public
 */
export const verifyCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findOne({
      certificateId: req.params.id,
      status: 'Issued',
    })
      .populate('user', 'name')
      .populate('course', 'title')
      .populate('liveCourse', 'title');

    if (!cert) {
      return res.status(404).json({ success: false, valid: false, message: 'Certificate not found or has been revoked' });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        certificateId: cert.certificateId,
        studentName: cert.studentName,
        courseName: cert.courseName,
        issueDate: cert.issueDate,
        completionDate: cert.completionDate,
        type: cert.type,
        certificateType: cert.certificateType,
        templateName: cert.templateName,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── STUDENT RECEIPTS ─────────────────────────────────────────────────────────

export const getMyReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.find({ user: req.user.id })
      .populate('course', 'title')
      .populate('liveCourse', 'title')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: receipts.length,
      data: receipts.map(mapReceiptDocument),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const serveReceiptPDF = async (req, res) => {
  try {
    const receipt = await Receipt.findOne({ receiptId: req.params.receiptId })
      .select('receiptId fileUrl user');

    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });

    if (!req.user || (receipt.user.toString() !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this receipt' });
    }

    const disposition = req.path.endsWith('/download') ? 'attachment' : 'inline';
    await sendCloudinaryPdf(res, receipt.fileUrl, {
      filename: `${receipt.receiptId}.pdf`,
      disposition,
    });
  } catch (error) {
    console.error('Serve receipt PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to serve receipt PDF' });
  }
};
