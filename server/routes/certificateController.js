import Certificate from '../models/Certificate.js';
import Receipt from '../models/Receipt.js';
import Enrollment from '../models/Enrollment.js';
import Counter from '../models/Counter.js';
import { generateCertificatePDF } from '../utils/generateCertificatePDF.js';
import { uploadPdfToCloudinary } from '../utils/uploadPdfToCloudinary.js';

// ==============================
// STUDENT CERTIFICATES
// ==============================

/**
 * @desc    Generate a new certificate for a completed enrollment
 * @route   POST /api/certificates/generate
 * @access  Private
 */
export const generateCertificate = async (req, res) => {
  try {
    const { enrollmentId } = req.body;

    // Find the enrollment to verify ownership and completion
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('course')
      .populate('liveCourse');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollment.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (enrollment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Course is not completed yet.' });
    }

    // Check if certificate already exists
    const courseType = enrollment.course ? 'course' : 'liveCourse';
    const courseId = enrollment[courseType]._id;

    const existingCert = await Certificate.findOne({
      user: req.user.id,
      [courseType]: courseId
    });

    if (existingCert) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already generated',
        data: existingCert
      });
    }

    // Prepare data for PDF generation
    const courseRef = enrollment[courseType];
    const serialNumber = await Counter.getNextSequence('certificates');
    const paddedSerial = String(serialNumber).padStart(4, '0');
    const currentYear = new Date().getFullYear();
    const certificateId = `FWT-IZON-${currentYear}-${paddedSerial}`;

    const pdfData = {
      studentName: req.user.name,
      courseName: courseRef.title,
      domain: courseRef.category || 'Professional Development',
      areaOfExpertise: 'Specialized Training',
      completionDate: enrollment.completedAt || new Date(),
      certificateId,
      serialNumber
    };

    // Generate PDF Buffer
    const pdfBuffer = await generateCertificatePDF(pdfData);

    // Upload to Cloudinary
    const fileUrl = await uploadPdfToCloudinary(
      pdfBuffer,
      `${certificateId}-${req.user.id}`,
      'fwtion/certificates'
    );

    // Save to database
    const certificate = await Certificate.create({
      certificateId,
      user: req.user.id,
      [courseType]: courseId,
      studentName: req.user.name,
      studentEmail: req.user.email,
      courseName: courseRef.title,
      domain: pdfData.domain,
      areaOfExpertise: pdfData.areaOfExpertise,
      issueDate: new Date(),
      completionDate: pdfData.completionDate,
      serialNumber,
      fileUrl,
      enrollment: enrollment._id
    });

    // Link back to enrollment
    enrollment.certificateId = certificate.certificateId;
    await enrollment.save({ validateBeforeSave: false });

    res.status(201).json({ success: true, data: certificate });
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

    res.status(200).json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCertificatesByUserId = async (req, res) => {
  try {
    // Security mapping constraint
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view these certificates' });
    }

    const certificates = await Certificate.find({ user: req.params.userId })
      .populate('course', 'title thumbnail category')
      .populate('liveCourse', 'title thumbnail category')
      .sort('-issueDate');

    res.status(200).json({ success: true, count: certificates.length, data: certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get a single certificate details (public for verification)
 * @route   GET /api/certificates/:certificateId
 * @access  Public
 */
export const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId })
      .populate('user', 'name avatar')
      .populate('course', 'title thumbnail category')
      .populate('liveCourse', 'title thumbnail category');

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// STUDENT RECEIPTS
// ==============================

/**
 * @desc    Get all receipts for the logged-in student
 * @route   GET /api/receipts/my
 * @access  Private
 */
export const getMyReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.find({ user: req.user.id })
      .populate('course', 'title')
      .populate('liveCourse', 'title')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: receipts.length, data: receipts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
