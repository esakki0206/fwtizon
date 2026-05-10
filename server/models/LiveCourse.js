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
  classStartTime: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => !value || /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
      message: 'Class start time must be in HH:mm format',
    },
  },
  classEndTime: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => !value || /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
      message: 'Class end time must be in HH:mm format',
    },
  },
  timezone: {
    type: String,
    trim: true,
    default: 'Asia/Kolkata',
  },
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

// Validate class time fields (pre-save)
// NOTE: Status is NO LONGER auto-overridden here. The admin controls it
// manually via the admin panel. This prevents the bug where .save() during
// enrollment would silently flip status to Ongoing/Completed and block users.
liveCourseSchema.pre('save', function() {
  if (this.classEndTime && !this.classStartTime) {
    this.invalidate('classStartTime', 'Class start time is required when class end time is set');
  }

  if (this.classStartTime && this.classEndTime) {
    const [startHours, startMinutes] = this.classStartTime.split(':').map(Number);
    const [endHours, endMinutes] = this.classEndTime.split(':').map(Number);
    const startTotal = (startHours * 60) + startMinutes;
    const endTotal = (endHours * 60) + endMinutes;

    if (endTotal <= startTotal) {
      this.invalidate('classEndTime', 'Class end time must be after class start time');
    }
  }
});

const LiveCourse = mongoose.model('LiveCourse', liveCourseSchema);
export default LiveCourse;
