import mongoose from 'mongoose';

const liveCourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a live course title'],
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
  instructorName: String,
  instructorImage: String,
  instructorDesignation: String,
  instructorBio: String,
  price: {
    type: Number,
    required: true,
  },
  startDate: Date,
  endDate: Date,
  schedule: [{
    day: String, // e.g. "Monday", "Wednesday"
    time: String, // e.g. "19:00"
    topic: String,
  }],
  zoomLink: String,
  whatsappGroup: String,
  resources: [{
    title: String,
    url: String,
  }],
  learningObjectives: [{
    type: String
  }],
  curriculum: [{
    title: String,
    description: String,
  }],
  requirements: [{
    type: String
  }],
  faqs: [{
    question: String,
    answer: String,
  }],
  maxStudents: {
    type: Number,
    default: 50,
  },
  currentEnrollments: {
    type: Number,
    default: 0,
  },
  domain: {
    type: String,
    default: 'Professional Development',
  },
  areaOfExpertise: {
    type: String,
    default: 'Specialized Training',
  },
  duration: String,
  thumbnail: {
    type: String,
    default: 'no-photo-live.jpg',
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Draft',
  },
}, {
  timestamps: true,
});

// Auto-update status middleware
liveCourseSchema.pre('save', function() {
  if (this.status !== 'Draft' && this.status !== 'Cancelled') {
    const today = new Date();
    const startDate = this.startDate ? new Date(this.startDate) : null;
    const endDate = this.endDate ? new Date(this.endDate) : null; // If duration is used without endDate, this might need parsing, but we will assume endDate is provided or we just check startDate
    
    if (startDate) {
      if (today < startDate) {
        this.status = 'Published';
      } else if (endDate && today > endDate) {
        this.status = 'Completed';
      } else {
        this.status = 'Ongoing';
      }
    }
  }
});

const LiveCourse = mongoose.model('LiveCourse', liveCourseSchema);
export default LiveCourse;
