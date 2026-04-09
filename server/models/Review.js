import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Please add a rating between 1 and 5'],
  },
  comment: {
    type: String,
    required: [true, 'Please add a comment'],
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: true,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Prevent user from submitting more than one review per course
reviewSchema.index({ course: 1, user: 1 }, { unique: true });

// Average rating logic
reviewSchema.statics.getAverageRating = async function (courseId) {
  const obj = await this.aggregate([
    {
      $match: { course: courseId }
    },
    {
      $group: {
        _id: '$course',
        averageRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  try {
    if (obj[0]) {
      await mongoose.model('Course').findByIdAndUpdate(courseId, {
        ratings: Math.ceil(obj[0].averageRating * 10) / 10,
        numReviews: obj[0].numReviews
      });
    } else {
      await mongoose.model('Course').findByIdAndUpdate(courseId, {
        ratings: 0,
        numReviews: 0
      });
    }
  } catch (err) {
    console.error(err);
  }
};

// Call getAverageRating after save
reviewSchema.post('save', async function () {
  await this.constructor.getAverageRating(this.course);
});

// Call getAverageRating after remove
reviewSchema.post('remove', async function () {
  await this.constructor.getAverageRating(this.course);
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
