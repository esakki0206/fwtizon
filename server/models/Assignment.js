import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add an assignment title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'Assignment must belong to a course'],
  },
  module: {
    type: mongoose.Schema.ObjectId,
    ref: 'Module',
  },
  dueDate: {
    type: Date,
    required: [true, 'Please set a due date'],
  },
  maxMarks: {
    type: Number,
    required: [true, 'Please set maximum marks'],
    min: [1, 'Maximum marks must be at least 1'],
    default: 100,
  },
  fileAttachment: {
    type: String,
    default: null,
  },
  allowResubmission: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'draft'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

assignmentSchema.virtual('submissions', {
  ref: 'AssignmentSubmission',
  localField: '_id',
  foreignField: 'assignment',
  justOne: false,
});

assignmentSchema.index({ course: 1, module: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
