/**
 * TEST NOTIFICATION UTILITY
 * 
 * Quick way to test notifications from backend
 * Usage: Add this route temporarily to test the system
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createNotification, NOTIFICATION_TYPES } from '../utils/notificationHelper.js';

const router = express.Router();

// Test endpoint - creates sample notifications
router.post('/test', protect, async (req, res) => {
  const io = req.app.get('io');
  const userId = req.user._id;

  try {
    // Create multiple test notifications
    const notifications = [];

    // 1. System notification
    notifications.push(await createNotification(io, userId, {
      title: '🎉 Welcome to Notifications!',
      message: 'Your notification system is working perfectly. Click to explore the marketplace.',
      type: NOTIFICATION_TYPES.SYSTEM,
      link: '/browse'
    }));

    // 2. Item notification
    notifications.push(await createNotification(io, userId, {
      title: '🛍️ New Item Listed',
      message: 'iPhone 13 Pro - ₹45,000. Check it out before it\'s gone!',
      type: NOTIFICATION_TYPES.ITEM,
      link: '/browse'
    }));

    // 3. Message notification
    notifications.push(await createNotification(io, userId, {
      title: '💬 New Message',
      message: 'John Doe: Hey, is the laptop still available?',
      type: NOTIFICATION_TYPES.MESSAGE,
      link: '/chats'
    }));

    // 4. Event notification
    notifications.push(await createNotification(io, userId, {
      title: '📅 Campus Event Tomorrow',
      message: 'Tech Fest 2024 starts at 10 AM in the main auditorium',
      type: NOTIFICATION_TYPES.EVENT,
      link: '/events'
    }));

    // 5. Sport notification
    notifications.push(await createNotification(io, userId, {
      title: '🏆 Basketball Match',
      message: 'Join us for a friendly match at 5 PM today!',
      type: NOTIFICATION_TYPES.SPORT,
      link: '/sports'
    }));

    // 6. Lost & Found notification
    notifications.push(await createNotification(io, userId, {
      title: '📢 Lost Item Found',
      message: 'Someone found a blue backpack near the library',
      type: NOTIFICATION_TYPES.LOST_FOUND,
      link: '/lost-and-found'
    }));

    // 7. Alert notification
    notifications.push(await createNotification(io, userId, {
      title: '⚠️ Important Update',
      message: 'Please update your profile information to continue using KampusCart',
      type: NOTIFICATION_TYPES.ALERT,
      link: '/profile'
    }));

    res.json({
      success: true,
      message: `Created ${notifications.length} test notifications`,
      notifications
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create test notifications',
      error: error.message
    });
  }
});

// Test endpoint - get notification stats
router.get('/stats', protect, async (req, res) => {
  try {
    const Notification = (await import('../models/Notification.js')).default;
    
    const total = await Notification.countDocuments({ userId: req.user._id });
    const unread = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    const byType = await Notification.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
      userId: req.user._id,
      userName: req.user.name,
      total,
      unread,
      read: total - unread,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
});

// Test endpoint - clear all notifications
router.delete('/clear', protect, async (req, res) => {
  try {
    const Notification = (await import('../models/Notification.js')).default;
    const result = await Notification.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message
    });
  }
});

export default router;

/**
 * TO USE THIS TEST UTILITY:
 * 
 * 1. Add to server.js:
 *    import testNotificationRoutes from './routes/testNotificationRoutes.js';
 *    app.use('/api/notifications/test', testNotificationRoutes);
 * 
 * 2. Test endpoints:
 *    POST   /api/notifications/test/test   - Create sample notifications
 *    GET    /api/notifications/test/stats  - Get notification statistics
 *    DELETE /api/notifications/test/clear  - Clear all notifications
 * 
 * 3. Example using curl:
 *    curl -X POST http://localhost:5000/api/notifications/test/test \
 *      -H "Authorization: Bearer YOUR_TOKEN" \
 *      -H "Content-Type: application/json"
 * 
 * 4. Or use Postman/Thunder Client with your JWT token
 * 
 * 5. REMOVE THIS ROUTE IN PRODUCTION!
 */
