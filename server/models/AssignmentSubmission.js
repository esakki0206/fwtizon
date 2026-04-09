import mongoose from 'mongoose';

const assignmentSubmissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Assignment',
    required: [true, 'Submission must reference an assignment'],
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Submission must reference a student'],
  },
  fileUrl: {
    type: String,
    default: null,
  },
  textResponse: {
    type: String,
    default: '',
  },
  grade: {
    type: Number,
    default: null,
    min: 0,
  },
  feedback: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'resubmitted'],
    default: 'submitted',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  gradedAt: {
    type: Date,
    default: null,
  },
  gradedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// Allow resubmission by not enforcing strict uniqueness — 
// use latest submission logic in the route handler instead
assignmentSubmissionSchema.index({ assignment: 1, student: 1 });

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
export default AssignmentSubmission;
