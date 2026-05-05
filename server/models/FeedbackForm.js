import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['rating', 'text', 'textarea', 'select'],
    default: 'text',
  },
  required: {
    type: Boolean,
    default: true,
  },
  options: [{
    type: String,
    trim: true,
  }],
}, { _id: true });

const feedbackFormSchema = new mongoose.Schema({
  liveCourse: {
    type: mongoose.Schema.ObjectId,
    ref: 'LiveCourse',
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
  },
  title: {
    type: String,
    required: [true, 'Feedback form title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters'],
    default: '',
  },
  questions: {
    type: [questionSchema],
    validate: {
      validator: function (arr) {
        return arr && arr.length > 0;
      },
      message: 'At least one question is required',
    },
  },
  unlockDate: {
    type: Date,
    default: null,
  },
  submissionDeadline: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  availableCertificateTypes: {
    type: [String],
    enum: ['Completion Certificate', 'Participation Certificate', 'Excellence Certificate'],
    default: ['Completion Certificate'],
    validate: {
      validator: function (arr) {
        return arr && arr.length > 0;
      },
      message: 'At least one certificate type is required',
    },
  },
  certificateTemplate: {
    type: mongoose.Schema.ObjectId,
    ref: 'CertificateTemplate',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Ensure a feedback form is unique per liveCourse OR course, but allow multiple nulls
feedbackFormSchema.index({ liveCourse: 1 }, { unique: true, sparse: true });
feedbackFormSchema.index({ course: 1 }, { unique: true, sparse: true });

const FeedbackForm = mongoose.model('FeedbackForm', feedbackFormSchema);
export default FeedbackForm;
