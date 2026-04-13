import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createNotification, NOTIFICATION_TYPES } from '../utils/notificationHelper.js';

const router = express.Router();

// Simple test route: GET /api/debug/test-notification
router.get('/test-notification', protect, async (req, res) => {
  try {
    const io = req.app.get('io');
    const userId = req.user._id;

    console.log('🧪 Creating test notification for user:', userId);

    const notification = await createNotification(io, userId, {
      title: '🎉 Test Notification',
      message: 'This is a test notification. If you see this, the system is working!',
      type: NOTIFICATION_TYPES.SYSTEM,
      link: '/browse'
    });

    console.log('✅ Test notification created:', notification._id);

    res.json({
      success: true,
      message: 'Test notification created! Check the bell icon.',
      notification
    });
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
      error: error.message
    });
  }
});

// Check notification count: GET /api/debug/notification-count
router.get('/notification-count', protect, async (req, res) => {
  try {
    const Notification = (await import('../models/Notification.js')).default;
    
    const total = await Notification.countDocuments({ userId: req.user._id });
    const unread = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    
    const latest = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    res.json({
      userId: req.user._id,
      userName: req.user.name,
      total,
      unread,
      latest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
