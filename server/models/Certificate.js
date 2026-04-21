import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  certificateId: { 
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
  studentName: { 
    type: String, 
    required: true 
  },
  studentEmail: { 
    type: String, 
    required: true 
  },
  courseName: { 
    type: String, 
    required: true 
  },
  domain: {
    type: String
  },
  areaOfExpertise: {
    type: String
  },
  issueDate: { 
    type: Date, 
    default: Date.now 
  },
  completionDate: {
    type: Date
  },
  serialNumber: {
    type: Number
  },
  fileUrl: { 
    type: String,
    required: true
  },
  status: { 
    type: String, 
    enum: ['Issued', 'Revoked'], 
    default: 'Issued' 
  },
  enrollment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Enrollment'
  },
  type: {
    type: String,
    enum: ['COURSE', 'COHORT'],
    default: 'COURSE'
  }
}, { timestamps: true });

// Prevent duplicate certificates
certificateSchema.index({ user: 1, course: 1 }, { unique: true, sparse: true });
certificateSchema.index({ user: 1, liveCourse: 1, type: 1 }, { unique: true, sparse: true });

export default mongoose.model('Certificate', certificateSchema);
