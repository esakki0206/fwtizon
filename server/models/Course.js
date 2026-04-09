import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a course title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  slug: {
    type: String,
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  instructor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  price: {
    type: Number,
    required: [true, 'Please add a course price'],
    default: 0,
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Development', 'Business', 'IT & Software', 'Design', 'Marketing', 'Personal Development'],
  },
  thumbnail: {
    type: String,
    default: 'no-photo.jpg',
  },
  ratings: {
    type: Number,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  enrollmentCount: {
    type: Number,
    default: 0,
  },
  isLive: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Reverse populate with virtuals
courseSchema.virtual('modules', {
  ref: 'Module',
  localField: '_id',
  foreignField: 'course',
  justOne: false,
});

courseSchema.pre('save', function () {
  if (this.title) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
});

const Course = mongoose.model('Course', courseSchema);
export default Course;
