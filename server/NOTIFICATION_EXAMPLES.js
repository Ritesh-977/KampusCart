/**
 * NOTIFICATION INTEGRATION EXAMPLES
 * Copy these snippets into your existing controllers to add notifications
 */

import { createNotification, NOTIFICATION_TYPES } from '../utils/notificationHelper.js';

// ═══════════════════════════════════════════════════════════════════════════
// ITEM NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// 1. When someone adds item to wishlist → notify seller
export const addToWishlistNotification = async (req, itemId, sellerId) => {
  const io = req.app.get('io');
  const item = await Item.findById(itemId);
  
  await createNotification(io, sellerId, {
    title: 'Item Added to Wishlist',
    message: `${req.user.name} added "${item.title}" to their wishlist`,
    type: NOTIFICATION_TYPES.ITEM,
    link: `/item/${itemId}`
  });
};

// 2. When item is marked as sold → notify wishlist users
export const itemSoldNotification = async (req, itemId) => {
  const io = req.app.get('io');
  const item = await Item.findById(itemId);
  const users = await User.find({ wishlist: itemId });
  
  for (const user of users) {
    await createNotification(io, user._id, {
      title: 'Wishlist Item Sold',
      message: `"${item.title}" has been marked as sold`,
      type: NOTIFICATION_TYPES.ITEM,
      link: `/item/${itemId}`
    });
  }
};

// 3. When new item is listed in user's category preference
export const newItemInCategoryNotification = async (req, item) => {
  const io = req.app.get('io');
  // Notify users interested in this category (you can add category preferences to User model)
  const interestedUsers = await User.find({ 
    college: item.college,
    interestedCategories: item.category,
    _id: { $ne: item.seller }
  });
  
  for (const user of interestedUsers) {
    await createNotification(io, user._id, {
      title: `New ${item.category} Listed`,
      message: `${item.title} - ₹${item.price}`,
      type: NOTIFICATION_TYPES.ITEM,
      link: `/item/${item._id}`
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CHAT/MESSAGE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// 4. When new message is received (already handled by socket, but for offline users)
export const newMessageNotification = async (req, message, recipientId) => {
  const io = req.app.get('io');
  
  await createNotification(io, recipientId, {
    title: 'New Message',
    message: `${req.user.name}: ${message.content.substring(0, 50)}...`,
    type: NOTIFICATION_TYPES.MESSAGE,
    link: `/chats?chat=${message.chat}`
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// EVENT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// 5. When new event is created → notify all college users
export const newEventNotification = async (req, event) => {
  const io = req.app.get('io');
  const users = await User.find({ 
    college: req.user.college,
    _id: { $ne: req.user._id }
  });
  
  for (const user of users) {
    await createNotification(io, user._id, {
      title: 'New Campus Event',
      message: `${event.title} - ${new Date(event.date).toLocaleDateString()}`,
      type: NOTIFICATION_TYPES.EVENT,
      link: `/events/${event._id}`
    });
  }
};

// 6. Event reminder (1 day before) - use with cron job
export const eventReminderNotification = async (io, event) => {
  const participants = await User.find({ _id: { $in: event.participants } });
  
  for (const user of participants) {
    await createNotification(io, user._id, {
      title: 'Event Reminder',
      message: `"${event.title}" is tomorrow at ${event.time}`,
      type: NOTIFICATION_TYPES.EVENT,
      link: `/events/${event._id}`
    });
  }
};

// 7. Event cancelled → notify participants
export const eventCancelledNotification = async (req, event) => {
  const io = req.app.get('io');
  const participants = await User.find({ _id: { $in: event.participants } });
  
  for (const user of participants) {
    await createNotification(io, user._id, {
      title: 'Event Cancelled',
      message: `"${event.title}" has been cancelled`,
      type: NOTIFICATION_TYPES.ALERT,
      link: `/events`
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SPORT NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// 8. New sport activity posted
export const newSportActivityNotification = async (req, sport) => {
  const io = req.app.get('io');
  const users = await User.find({ 
    college: req.user.college,
    _id: { $ne: req.user._id }
  });
  
  for (const user of users) {
    await createNotification(io, user._id, {
      title: 'New Sport Activity',
      message: `${sport.sport} - ${sport.venue}`,
      type: NOTIFICATION_TYPES.SPORT,
      link: `/sports/${sport._id}`
    });
  }
};

// 9. Sport registration confirmed
export const sportRegistrationNotification = async (req, sport) => {
  const io = req.app.get('io');
  
  await createNotification(io, req.user._id, {
    title: 'Registration Confirmed',
    message: `You're registered for ${sport.sport} at ${sport.venue}`,
    type: NOTIFICATION_TYPES.SPORT,
    link: `/sports/${sport._id}`
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// LOST & FOUND NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// 10. New lost item reported
export const newLostItemNotification = async (req, lostItem) => {
  const io = req.app.get('io');
  const users = await User.find({ 
    college: req.user.college,
    _id: { $ne: req.user._id }
  });
  
  for (const user of users) {
    await createNotification(io, user._id, {
      title: 'Lost Item Reported',
      message: `${lostItem.title} - ${lostItem.location}`,
      type: NOTIFICATION_TYPES.LOST_FOUND,
      link: `/lost-and-found/${lostItem._id}`
    });
  }
};

// 11. Item marked as found
export const itemFoundNotification = async (req, lostItem) => {
  const io = req.app.get('io');
  
  await createNotification(io, lostItem.reportedBy, {
    title: 'Item Found!',
    message: `Your lost item "${lostItem.title}" has been marked as found`,
    type: NOTIFICATION_TYPES.LOST_FOUND,
    link: `/lost-and-found/${lostItem._id}`
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// 12. User banned → notify user
export const userBannedNotification = async (io, userId, reason, duration) => {
  await createNotification(io, userId, {
    title: 'Account Suspended',
    message: `Your account has been suspended${duration ? ` for ${duration}` : ''}. Reason: ${reason}`,
    type: NOTIFICATION_TYPES.ALERT,
    link: '/settings'
  });
};

// 13. Item reported → notify admin
export const itemReportedNotification = async (io, adminId, item, reportedBy) => {
  await createNotification(io, adminId, {
    title: 'Item Reported',
    message: `"${item.title}" was reported by ${reportedBy.name}`,
    type: NOTIFICATION_TYPES.ALERT,
    link: `/admin/reports`
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// 14. Welcome notification for new users
export const welcomeNotification = async (io, userId) => {
  await createNotification(io, userId, {
    title: 'Welcome to KampusCart! 🎉',
    message: 'Start buying and selling items on your campus. Check out the latest listings!',
    type: NOTIFICATION_TYPES.SYSTEM,
    link: '/browse'
  });
};

// 15. Profile completion reminder
export const profileCompletionNotification = async (io, userId) => {
  await createNotification(io, userId, {
    title: 'Complete Your Profile',
    message: 'Add a profile picture and phone number to build trust with buyers and sellers',
    type: NOTIFICATION_TYPES.SYSTEM,
    link: '/profile'
  });
};

// 16. Maintenance notification (broadcast to all)
export const maintenanceNotification = async (io, message, scheduledTime) => {
  const users = await User.find({});
  
  for (const user of users) {
    await createNotification(io, user._id, {
      title: 'Scheduled Maintenance',
      message: `${message} Scheduled for: ${scheduledTime}`,
      type: NOTIFICATION_TYPES.ALERT,
      link: null
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HOW TO USE IN YOUR CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

/*

EXAMPLE 1: In itemController.js - Add to wishlist

import { createNotification, NOTIFICATION_TYPES } from '../utils/notificationHelper.js';

export const addToWishlist = async (req, res) => {
  const { itemId } = req.body;
  const user = await User.findById(req.user._id);
  
  if (!user.wishlist.includes(itemId)) {
    user.wishlist.push(itemId);
    await user.save();
    
    // ADD THIS: Notify seller
    const item = await Item.findById(itemId);
    const io = req.app.get('io');
    await createNotification(io, item.seller, {
      title: 'Item Added to Wishlist',
      message: `${user.name} added "${item.title}" to their wishlist`,
      type: NOTIFICATION_TYPES.ITEM,
      link: `/item/${itemId}`
    });
  }
  
  res.json(user.wishlist);
};

─────────────────────────────────────────────────────────────────────────────

EXAMPLE 2: In authController.js - Welcome new user

export const signup = async (req, res) => {
  const user = await User.create(req.body);
  const token = generateToken(user._id);
  
  // ADD THIS: Send welcome notification
  const io = req.app.get('io');
  await createNotification(io, user._id, {
    title: 'Welcome to KampusCart! 🎉',
    message: 'Start exploring items on your campus',
    type: NOTIFICATION_TYPES.SYSTEM,
    link: '/browse'
  });
  
  res.json({ user, token });
};

─────────────────────────────────────────────────────────────────────────────

EXAMPLE 3: In eventController.js - New event

export const createEvent = async (req, res) => {
  const event = await Event.create({
    ...req.body,
    createdBy: req.user._id
  });
  
  // ADD THIS: Notify all college users
  const io = req.app.get('io');
  const users = await User.find({ 
    college: req.user.college,
    _id: { $ne: req.user._id }
  });
  
  for (const user of users) {
    await createNotification(io, user._id, {
      title: 'New Campus Event',
      message: `${event.title} - ${new Date(event.date).toLocaleDateString()}`,
      type: NOTIFICATION_TYPES.EVENT,
      link: `/events/${event._id}`
    });
  }
  
  res.status(201).json(event);
};

*/
