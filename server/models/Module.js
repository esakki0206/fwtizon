import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a module title'],
    trim: true,
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Reverse populate with virtuals for lessons
moduleSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'module',
  justOne: false,
});

moduleSchema.virtual('quiz', {
  ref: 'Quiz',
  localField: '_id',
  foreignField: 'module',
  justOne: true,
});

const Module = mongoose.model('Module', moduleSchema);
export default Module;
