import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true,
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, { _id: false });

const feedbackSubmissionSchema = new mongoose.Schema({
  feedbackForm: {
    type: mongoose.Schema.ObjectId,
    ref: 'FeedbackForm',
    required: [true, 'Feedback form reference is required'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
  },
  liveCourse: {
    type: mongoose.Schema.ObjectId,
    ref: 'LiveCourse',
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
  },
  enrollment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Enrollment',
    required: [true, 'Enrollment reference is required'],
  },
  responses: {
    type: [responseSchema],
    validate: {
      validator: function (arr) {
        return arr && arr.length > 0;
      },
      message: 'At least one response is required',
    },
  },
  selectedCertificateType: {
    type: String,
    enum: ['Completion Certificate', 'Participation Certificate', 'Excellence Certificate'],
    required: [true, 'Certificate type selection is required'],
    default: 'Completion Certificate',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Prevent duplicate submissions: one submission per user per form
feedbackSubmissionSchema.index({ feedbackForm: 1, user: 1 }, { unique: true });

// Fast lookup by course + user
feedbackSubmissionSchema.index({ liveCourse: 1, user: 1 });
feedbackSubmissionSchema.index({ course: 1, user: 1 });

const FeedbackSubmission = mongoose.model('FeedbackSubmission', feedbackSubmissionSchema);
export default FeedbackSubmission;
