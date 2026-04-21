import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema({
  receiptId: {
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
  enrollment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  paymentId: {
    type: String,
    required: true
  },
  orderId: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  userName: String,
  userEmail: String,
  courseName: String,
  fileUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  }
}, { timestamps: true });

// Prevent duplicate receipts for the same enrollment
receiptSchema.index({ user: 1, enrollment: 1 }, { unique: true });

export default mongoose.model('Receipt', receiptSchema);
