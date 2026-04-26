import mongoose from 'mongoose';

/**
 * Coupon Model
 *
 * Supports:
 *  - Global coupons (applicableCourses is empty)
 *  - Course-specific coupons
 *  - Optional start/expiry windows
 *  - Usage limits
 *  - Minimum course price gate
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [1, 'Discount must be at least 1%'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Optional window start — null means "valid immediately"
    startDate: {
      type: Date,
      default: null,
    },
    // Required hard expiry
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    // null = unlimited usage
    usageLimit: {
      type: Number,
      default: null,
      min: [1, 'Usage limit must be at least 1 if set'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // null = no minimum price requirement
    minimumPrice: {
      type: Number,
      default: null,
      min: [0, 'Minimum price cannot be negative'],
    },
    // Empty array = global coupon; non-empty = only those courses
    applicableCourses: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Course',
      },
    ],
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
couponSchema.index({ code: 1 });                  // fast code lookup
couponSchema.index({ expiryDate: 1 });             // expiry queries
couponSchema.index({ isActive: 1, expiryDate: 1 }); // active + not-expired compound

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
