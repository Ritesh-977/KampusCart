import Notification from '../models/Notification.js';

/**
 * Create and emit a notification
 * @param {Object} io - Socket.io instance
 * @param {String} userId - Target user ID
 * @param {Object} data - Notification data { title, message, type, link, metadata }
 */
export const createNotification = async (io, userId, { title, message, type = 'system', link = null, metadata = {} }) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      link,
      metadata
    });

    if (io) {
      io.to(String(userId)).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

/**
 * Notification type constants
 */
export const NOTIFICATION_TYPES = {
  SYSTEM: 'system',
  MESSAGE: 'message',
  ITEM: 'item',
  EVENT: 'event',
  SPORT: 'sport',
  LOST_FOUND: 'lost_found',
  ALERT: 'alert'
};
