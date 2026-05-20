import mongoose from 'mongoose';

const refundRecordSchema = new mongoose.Schema({
  enrollment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Enrollment',
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
  courseType: {
    type: String,
    required: [true, 'Please specify the course type (self-paced or live)'],
    enum: ['self-paced', 'live'],
  },
  amount: {
    type: Number,
    required: [true, 'Please add the refund amount'],
    min: [0, 'Amount cannot be negative'],
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot be more than 500 characters'],
  },
  refundDate: {
    type: Date,
    required: true,
  },
  processedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// One refund record per enrollment
refundRecordSchema.index({ enrollment: 1 }, { unique: true });
refundRecordSchema.index({ course: 1 });
refundRecordSchema.index({ liveCourse: 1 });

const RefundRecord = mongoose.model('RefundRecord', refundRecordSchema);
export default RefundRecord;
