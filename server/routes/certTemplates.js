import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { protect, authorize } from '../middleware/auth.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import Certificate from '../models/Certificate.js';
import FeedbackForm from '../models/FeedbackForm.js';
import { sanitizeOverlays, validateOverlays, isValidTemplateName } from '../lib/inputValidation.js';

const router = express.Router();

// ── Multer: memory storage (we pipe to Cloudinary) ────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, WEBP, or PDF files are allowed'));
  },
});

// ── Cloudinary upload helper ──────────────────────────────────────────────────
const uploadTemplateToCloudinary = (buffer, filename, mimetype) =>
  new Promise((resolve, reject) => {
    const isPdf = mimetype === 'application/pdf';
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'fwtion/cert-templates',
        public_id: filename,
        resource_type: isPdf ? 'image' : 'image',
        format: isPdf ? 'pdf' : undefined,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cert-templates — list all templates (admin) or active only (student)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const query = CertificateTemplate.find(filter).sort('-createdAt');
    if (req.user.role !== 'admin') {
      query.select('-overlays');
    }

    const templates = await query;
    res.json({ success: true, count: templates.length, data: templates });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cert-templates/:id — full template with overlays
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cert-templates — upload new template (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  protect,
  authorize('admin'),
  upload.single('templateFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Template image file is required' });
      }

      const { templateName, description, width, height, orientation, isDefault } = req.body;

      if (!templateName?.trim()) {
        return res.status(400).json({ success: false, message: 'templateName is required' });
      }

      const filename = `tpl_${Date.now()}_${templateName.replace(/\s+/g, '_').toLowerCase()}`;
      const uploaded = await uploadTemplateToCloudinary(req.file.buffer, filename, req.file.mimetype);

      const isPdf = req.file.mimetype === 'application/pdf';
      const makeDefault = isDefault === 'true' || isDefault === true;

      const template = await CertificateTemplate.create({
        templateName: templateName.trim(),
        description: description?.trim() || '',
        fileUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        fileType: isPdf ? 'pdf' : 'image',
        width: parseInt(width, 10) || uploaded.width || 2480,
        height: parseInt(height, 10) || uploaded.height || 3508,
        orientation: orientation || 'portrait',
        isDefault: makeDefault,
        isActive: true,
        overlays: [],
        createdBy: req.user.id,
      });

      res.status(201).json({ success: true, data: template });
    } catch (e) {
      console.error('Template upload error:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/cert-templates/:id — update metadata + overlays
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const { templateName, description, orientation, isDefault, isActive, overlays, metadata } = req.body;

    if (templateName !== undefined) {
      if (!isValidTemplateName(templateName)) {
        return res.status(400).json({ success: false, message: 'Invalid template name (1-255 characters)' });
      }
      template.templateName = templateName.trim();
    }
    
    if (description !== undefined) template.description = description.trim();
    if (orientation !== undefined) template.orientation = orientation;
    if (isActive !== undefined) {
      if (isActive === false || isActive === 'false') {
        const feedbackFormCount = await FeedbackForm.countDocuments({ certificateTemplate: req.params.id });
        if (feedbackFormCount > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot deactivate — ${feedbackFormCount} feedback form(s) use this template.`,
          });
        }
      }
      template.isActive = isActive;
    }
    
    // Validate and sanitize overlays
    if (overlays !== undefined) {
      if (!Array.isArray(overlays)) {
        return res.status(400).json({ success: false, message: 'Overlays must be an array' });
      }
      
      const sanitized = sanitizeOverlays(overlays);
      const validation = validateOverlays(sanitized);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid overlay configuration',
          errors: validation.errors,
        });
      }
      
      template.overlays = sanitized;
    }

    // Update metadata if provided
    if (metadata !== undefined) {
      template.metadata = {
        editorZoom: Math.max(50, Math.min(200, metadata.editorZoom || 100)),
        gridSize: Math.max(5, Math.min(50, metadata.gridSize || 10)),
        showGrid: Boolean(metadata.showGrid),
      };
    }

    // Handle default flag (pre-save hook clears others)
    if (isDefault !== undefined) template.isDefault = Boolean(isDefault);

    await template.save();
    res.json({ success: true, data: template });
  } catch (e) {
    console.error('Template update error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/cert-templates/:id/overlays — save overlay positions only
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/overlays', protect, authorize('admin'), async (req, res) => {
  try {
    const { overlays } = req.body;
    if (!Array.isArray(overlays)) {
      return res.status(400).json({ success: false, message: 'overlays must be an array' });
    }

    // Validate and sanitize overlays
    const sanitized = sanitizeOverlays(overlays);
    const validation = validateOverlays(sanitized);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid overlay configuration',
        errors: validation.errors,
      });
    }

    const template = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      { overlays: sanitized },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (e) {
    console.error('Overlay update error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/cert-templates/:id/set-default
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/set-default', protect, authorize('admin'), async (req, res) => {
  try {
    await CertificateTemplate.updateMany({}, { $set: { isDefault: false } });
    const template = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      { isDefault: true },
      { new: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template, message: 'Default template updated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/cert-templates/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const template = await CertificateTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    // Check if any certificates use this template
    const certCount = await Certificate.countDocuments({ templateId: req.params.id });
    if (certCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${certCount} certificate(s) reference this template. Deactivate it instead.`,
      });
    }

    const feedbackFormCount = await FeedbackForm.countDocuments({ certificateTemplate: req.params.id });
    if (feedbackFormCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${feedbackFormCount} feedback form(s) use this template. Deactivate it instead.`,
      });
    }

    // Delete from Cloudinary
    if (template.publicId) {
      try {
        await cloudinary.uploader.destroy(template.publicId, { resource_type: 'image' });
      } catch (cdErr) {
        console.error('Cloudinary delete error (non-fatal):', cdErr.message);
      }
    }

    await template.deleteOne();
    res.json({ success: true, message: 'Template deleted', data: {} });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
