import mongoose from 'mongoose';

const resourcePersonExpenseSchema = new mongoose.Schema({
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
  resourcePersonName: {
    type: String,
    required: [true, 'Please add the resource person name'],
    trim: true,
    maxlength: [200, 'Name cannot be more than 200 characters'],
  },
  amount: {
    type: Number,
    required: [true, 'Please add the payment amount'],
    min: [0, 'Amount cannot be negative'],
  },
  paymentDate: {
    type: Date,
    required: [true, 'Please add the payment date'],
  },
  paymentMethod: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot be more than 1000 characters'],
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Ensure every expense references at least one course type
resourcePersonExpenseSchema.pre('validate', function () {
  if (!this.course && !this.liveCourse) {
    throw new Error('Expense must reference either a course or a liveCourse');
  }
});

// Indexes for faster querying
resourcePersonExpenseSchema.index({ course: 1 });
resourcePersonExpenseSchema.index({ liveCourse: 1 });
resourcePersonExpenseSchema.index({ status: 1 });
resourcePersonExpenseSchema.index({ paymentDate: -1 });

const ResourcePersonExpense = mongoose.model('ResourcePersonExpense', resourcePersonExpenseSchema);
export default ResourcePersonExpense;
