import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
       { _id: req.params.id, user: req.user.id },
       { isRead: true },
       { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: "Notification not found" });
    
    res.status(200).json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
