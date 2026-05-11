import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
  },
  liveCourse: {
    type: mongoose.Schema.ObjectId,
    ref: 'LiveCourse',
  },
  paymentId: {
    type: String,
  },
  amount: {
    type: Number,
  },
  enrollmentType: {
    type: String,
    enum: ['auto', 'paid', 'free', 'admin'],
    default: 'paid',
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  fullName: String,
  email: String,
  phone: String,
  message: String,
  progress: {
    completedLessons: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Lesson',
    }],
    quizScores: [{
      quiz: {
        type: mongoose.Schema.ObjectId,
        ref: 'Quiz',
      },
      score: Number,
      passed: Boolean,
      attempts: Number,
    }],
    percentComplete: {
      type: Number,
      default: 0,
    },
  },
  certificateId: {
    type: String,
    unique: true,
    sparse: true,
  },
  completedAt: Date,

  // ── Coupon / discount tracking ────────────────────────────────────────
  couponCode: {
    type: String,
    default: null,
  },
  originalAmount: {
    type: Number,
    default: null,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Ensure every enrollment references at least one course type — never allow both null
enrollmentSchema.pre('validate', function () {
  if (!this.course && !this.liveCourse) {
    throw new Error('Enrollment must reference either a course or a liveCourse');
  }
});

// Prevent duplicate enrollments but allow sparse logic
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true, sparse: true });
enrollmentSchema.index({ user: 1, liveCourse: 1 }, { unique: true, sparse: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
export default Enrollment;
