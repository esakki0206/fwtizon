import mongoose from 'mongoose';

/**
 * Overlay config for a single text field on the certificate template.
 * Coordinates are stored as PERCENTAGES (0–100) of template dimensions
 * so they scale correctly regardless of output resolution.
 */
const overlaySchema = new mongoose.Schema({
  // Unique identifier for overlay (generated if missing)
  id: { type: String, default: () => `ov_${Date.now()}_${Math.random().toString(36).slice(9)}` },

  // Field binding
  field: {
    type: String,
    required: true,
    enum: ['studentName', 'courseName', 'date', 'certificateId', 'serialNumber', 'instructorName', 'customText', 'wipe'],
  },
  label: { type: String, default: '' },
  customText: { type: String, default: '' },  // static text for customText field type

  // Position (% of template dimensions)
  x: { type: Number, required: true },         // % from left (0–100)
  y: { type: Number, required: true },         // % from top  (0–100)

  // Typography
  fontSize: { type: Number, default: 24 },     // pt at template natural size
  fontWeight: { type: String, default: 'normal', enum: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
  letterSpacing: { type: Number, default: 0 }, // px (can be negative)
  lineHeight: { type: Number, default: 1.2 },  // relative to fontSize

  fontFamily: {
    type: String,
    default: 'Helvetica-Bold',
    enum: [
      // Built-in PDFKit / standard PDF fonts
      'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
      'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
      'Courier', 'Courier-Bold',
      // Custom fonts bundled in /assets/fonts/
      'GreatVibes', 'PlayfairDisplay', 'PlayfairDisplay-Italic',
      'Roboto', 'Roboto-Italic', 'Inter', 'UncialAntiqua',
    ],
  },

  // Appearance
  color: { type: String, default: '#000000' },
  align: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
  maxWidth: { type: Number, default: 60 },     // % of template width (also used as box width for wipes)
  height: { type: Number, default: 5 },       // % of template height (used for wipes)
  uppercase: { type: Boolean, default: false },

  // Advanced styling (NEW)
  rotation: { type: Number, default: 0, min: 0, max: 360 }, // degrees
  opacity: { type: Number, default: 1, min: 0, max: 1 },    // 0–1
  visible: { type: Boolean, default: true },                 // toggle visibility

  // Date formatting
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
}, { _id: true });

const certificateTemplateSchema = new mongoose.Schema({
  templateName: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
  },
  description: { type: String, default: '' },

  // Cloudinary URL of the template background image
  fileUrl: {
    type: String,
    required: [true, 'Template file URL is required'],
  },
  fileType: { type: String, enum: ['image', 'pdf'], default: 'image' },
  publicId: { type: String, default: '' }, // cloudinary public_id for deletion

  // Natural pixel dimensions of the uploaded template image
  width: { type: Number, required: true, default: 2480 },
  height: { type: Number, required: true, default: 3508 },

  orientation: {
    type: String,
    enum: ['portrait', 'landscape'],
    default: 'portrait',
  },

  overlays: [overlaySchema],

  // NEW: Canonical dimensions for editor scaling (for pixel-perfect rendering)
  scaleBaseWidth: { type: Number, default: function() { return this.width / 2; } },
  scaleBaseHeight: { type: Number, default: function() { return this.height / 2; } },

  // NEW: Editor metadata
  metadata: {
    editorZoom: { type: Number, default: 100, min: 50, max: 200 },
    gridSize: { type: Number, default: 10 },
    showGrid: { type: Boolean, default: false },
  },

  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  createdBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
}, { timestamps: true });

// Only one template can be the default at a time
certificateTemplateSchema.pre('save', async function () {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }

  // MIGRATION: Set defaults for new fields if missing (backward compatibility)
  if (!this.scaleBaseWidth) this.scaleBaseWidth = this.width / 2;
  if (!this.scaleBaseHeight) this.scaleBaseHeight = this.height / 2;
  if (!this.metadata) {
    this.metadata = { editorZoom: 100, gridSize: 10, showGrid: false };
  }

  // Ensure all overlays have new fields with defaults
  if (this.overlays && Array.isArray(this.overlays)) {
    this.overlays.forEach(overlay => {
      if (!overlay.id) overlay.id = `ov_${Date.now()}_${Math.random().toString(36).slice(9)}`;
      if (overlay.fontWeight === undefined) overlay.fontWeight = 'normal';
      if (overlay.letterSpacing === undefined) overlay.letterSpacing = 0;
      if (overlay.lineHeight === undefined) overlay.lineHeight = 1.2;
      if (overlay.rotation === undefined) overlay.rotation = 0;
      if (overlay.opacity === undefined) overlay.opacity = 1;
      if (overlay.visible === undefined) overlay.visible = true;
    });
  }
});

export default mongoose.model('CertificateTemplate', certificateTemplateSchema);
