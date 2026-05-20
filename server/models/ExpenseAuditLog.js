import mongoose from 'mongoose';

const expenseAuditLogSchema = new mongoose.Schema({
  expenseType: {
    type: String,
    required: [true, 'Please specify the expense type'],
    enum: ['resource_person', 'other'],
  },
  expenseId: {
    type: mongoose.Schema.ObjectId,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'deleted'],
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  performedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  performedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

expenseAuditLogSchema.index({ expenseId: 1 });
expenseAuditLogSchema.index({ performedBy: 1 });
expenseAuditLogSchema.index({ performedAt: -1 });

const ExpenseAuditLog = mongoose.model('ExpenseAuditLog', expenseAuditLogSchema);
export default ExpenseAuditLog;
