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
    required: [true, 'Live course reference is required'],
    unique: true,
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
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// One feedback form per live course
feedbackFormSchema.index({ liveCourse: 1 }, { unique: true });

const FeedbackForm = mongoose.model('FeedbackForm', feedbackFormSchema);
export default FeedbackForm;
