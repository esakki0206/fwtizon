import mongoose from 'mongoose';

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
    enum: ['video', 'pdf', 'text'],
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Please add content or url'],
  },
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
}, {
  timestamps: true,
});

const Lesson = mongoose.model('Lesson', lessonSchema);
export default Lesson;
