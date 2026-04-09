import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please add question text'],
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'multi-answer'],
    default: 'multiple-choice',
  },
  options: [{
    text: String,
    isCorrect: Boolean,
  }],
  explanation: {
    type: String,
    default: '',
  },
  points: {
    type: Number,
    default: 1,
    min: [1, 'Points must be at least 1'],
  },
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a quiz title'],
  },
  description: {
    type: String,
    default: '',
  },
  module: {
    type: mongoose.Schema.ObjectId,
    ref: 'Module',
    required: true,
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: true,
  },
  questions: [questionSchema],
  passingScore: {
    type: Number,
    default: 75,
    min: 0,
    max: 100,
  },
  timeLimit: {
    type: Number, // in minutes, 0 = no limit
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: 1,
  },
  isFinal: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

quizSchema.pre('save', function (next) {
  if (this.isFinal && this.passingScore < 80) {
    this.passingScore = 80;
  }
  next();
});

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
