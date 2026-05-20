import mongoose from 'mongoose';

const courseOtherExpenseSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: [true, 'Please add an expense title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
  },
  category: {
    type: String,
    required: [true, 'Please select an expense category'],
    enum: ['marketing', 'venue', 'software_tools', 'certificates', 'travel', 'food', 'printing', 'miscellaneous'],
  },
  amount: {
    type: Number,
    required: [true, 'Please add the expense amount'],
    min: [0, 'Amount cannot be negative'],
  },
  date: {
    type: Date,
    required: [true, 'Please add the expense date'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot be more than 1000 characters'],
  },
  receiptUrl: {
    type: String,
  },
  receiptPublicId: {
    type: String,
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
courseOtherExpenseSchema.pre('validate', function () {
  if (!this.course && !this.liveCourse) {
    throw new Error('Expense must reference either a course or a liveCourse');
  }
});

// Indexes for faster querying
courseOtherExpenseSchema.index({ course: 1 });
courseOtherExpenseSchema.index({ liveCourse: 1 });
courseOtherExpenseSchema.index({ category: 1 });
courseOtherExpenseSchema.index({ date: -1 });

const CourseOtherExpense = mongoose.model('CourseOtherExpense', courseOtherExpenseSchema);
export default CourseOtherExpense;
