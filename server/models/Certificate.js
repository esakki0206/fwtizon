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
  issueDate: { 
    type: Date, 
    default: Date.now 
  },
  fileUrl: { 
    type: String,
    required: true
  },
  status: { 
    type: String, 
    enum: ['Issued', 'Revoked'], 
    default: 'Issued' 
  }
}, { timestamps: true });

export default mongoose.model('Certificate', certificateSchema);
