import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course'
  },
  liveCourse: {
    type: mongoose.Schema.ObjectId,
    ref: 'LiveCourse'
  },
  studentName: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  domain: { type: String },
  areaOfExpertise: { type: String },
  issueDate: { type: Date, default: Date.now },
  completionDate: { type: Date },
  serialNumber: { type: Number },
  fileUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['Issued', 'Revoked'],
    default: 'Issued'
  },
  enrollment: { type: mongoose.Schema.ObjectId, ref: 'Enrollment' },
  type: {
    type: String,
    enum: ['COURSE', 'COHORT'],
    default: 'COURSE'
  },
  certificateType: {
    type: String,
    enum: ['Completion Certificate', 'Participation Certificate', 'Excellence Certificate'],
    default: 'Completion Certificate'
  },
  // ── Template tracking ──────────────────────────────────────────────────────
  templateId: {
    type: mongoose.Schema.ObjectId,
    ref: 'CertificateTemplate',
    default: null,
  },
  // Snapshot of template name at time of generation (survives template deletion)
  templateName: {
    type: String,
    default: 'Legacy Template',
  },
  templateRenderedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// sparse: true on a compound index does NOT skip documents where only *some*
// fields are null — MongoDB only omits the document when ALL indexed fields are
// missing. When 'user' is always present but 'course' is null (liveCourse-type
// certificates), every such document gets indexed and the second one triggers
// a duplicate-key error.
//
// Fix: partialFilterExpression with $type:'objectId' — only index documents
// where the field actually holds an ObjectId reference. This is compatible with
// all MongoDB Atlas versions (including pre-7.0 where $ne:null is forbidden
// inside partialFilterExpression).
certificateSchema.index(
  { user: 1, course: 1 },
  { unique: true, partialFilterExpression: { course: { $type: 'objectId' } } }
);
certificateSchema.index(
  { user: 1, liveCourse: 1, type: 1 },
  { unique: true, partialFilterExpression: { liveCourse: { $type: 'objectId' } } }
);
certificateSchema.index({ templateId: 1 });

export default mongoose.model('Certificate', certificateSchema);
