import mongoose from 'mongoose';

const cohortApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  liveCourse: {
    type: mongoose.Schema.ObjectId,
    ref: 'LiveCourse',
    required: [true, 'Cohort ID is required'],
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
  },
  whatsappNumber: {
    type: String,
    required: [true, 'WhatsApp number is required'],
  },
  courseDepartment: {
    type: String,
  },
  experienceLevel: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Applied', 'Enrolled', 'Rejected'],
    default: 'Enrolled', // Since they applied via successful payment
  }
}, {
  timestamps: true,
});

// Prevent duplicate applications for the same cohort by the same email
cohortApplicationSchema.index({ liveCourse: 1, email: 1 }, { unique: true });

const CohortApplication = mongoose.model('CohortApplication', cohortApplicationSchema);
export default CohortApplication;
