import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Resource title is required'],
    trim: true,
  },
  url: {
    type: String,
    required: [true, 'Resource URL is required'],
  },
  type: {
    type: String,
    enum: ['pdf', 'link', 'file'],
    default: 'file',
  },
}, { _id: true });

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a lesson title'],
    trim: true,
  },
  module: {
    type: mongoose.Schema.ObjectId,
    ref: 'Module',
    required: true,
  },
  type: {
    type: String,
    enum: ['video', 'pdf', 'text', 'zoom', 'external_video'],
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  // ── Zoom Embed Fields ──────────────────────────────────────────────────
  zoomEmbedLink: {
    type: String,
    default: '',
  },
  zoomPassword: {
    type: String,
    default: '',
  },
  // ── Metadata ───────────────────────────────────────────────────────────
  duration: {
    type: Number, // duration in seconds
    default: 0,
  },
  order: {
    type: Number,
    required: true,
  },
  isPreview: {
    type: Boolean,
    default: false,
  },
  // ── Downloadable Resources ─────────────────────────────────────────────
  resources: [resourceSchema],
}, {
  timestamps: true,
});

const Lesson = mongoose.model('Lesson', lessonSchema);
export default Lesson;
