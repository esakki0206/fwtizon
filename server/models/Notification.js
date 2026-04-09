import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String, // 'system', 'course', 'payment', 'live'
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  link: {
    type: String, // URL to navigate
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
