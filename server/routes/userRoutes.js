import express from 'express';
import multer from 'multer';
import {
    getUserProfile,
    updateUserProfile,
    toggleWishlist,
    getWishlist,
    getUserById,
    getSellerProfile,
    changePassword,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

// 1. Import the storage you defined in utils/cloudinary.js
import { storage } from '../utils/cloudinaryConfig.js';
import User from '../models/User.js';
import Item from '../models/Item.js';

const router = express.Router();

// 2. Configure Multer to use that Cloudinary storage
const upload = multer({ storage });

// --- Profile Routes ---
router.route('/profile')
    .get(protect, getUserProfile)
    // 3. The file uploads to Cloudinary HERE automatically
     .put(protect, upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
]), updateUserProfile);

// --- Change Password ---
router.put('/change-password', protect, changePassword);

// --- Wishlist Routes ---
router.route('/wishlist')
    .post(protect, toggleWishlist)
    .get(protect, getWishlist);

// Save Expo push token for the logged-in user (addToSet — never overwrites other devices)
router.put('/push-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { pushSubscription: token },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove Expo push token on logout / token rotation
router.delete('/push-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { pushSubscription: token },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save Web Push (VAPID) subscription object — requires auth, uses addToSet
router.post('/subscribe', protect, async (req, res) => {
  try {
    const subscription = req.body.subscription;
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: 'Valid subscription object required' });
    }

    // Fetch the user, strip ALL entries sharing this endpoint in JS (handles
    // partial-match edge cases with nested keys that $pull can miss), then
    // push the single fresh subscription and save — one round-trip, no race.
    const user = await User.findById(req.user._id).select('pushSubscription');
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.pushSubscription = [
      ...user.pushSubscription.filter(
        (s) => !s?.endpoint || s.endpoint !== subscription.endpoint
      ),
      subscription,
    ];

    await user.save();
    res.status(201).json({ message: 'Push subscription saved successfully.' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Server error saving subscription' });
  }
});

// Remove Web Push subscription on unsubscribe / logout
router.delete('/subscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { pushSubscription: { endpoint } },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public stats endpoint for HeroSection
router.get('/counts', async (req, res) => {
    try {
        const [usersCount, itemsCount] = await Promise.all([
            User.countDocuments(),
            Item.countDocuments(),
        ]);

        res.json({ usersCount, itemsCount });
    } catch (error) {
        console.error('Failed to get counts', error);
        res.status(500).json({ message: 'Could not fetch counts' });
    }
});

// Notification preferences
router.get('/notification-prefs', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, 'notificationPrefs');
    const defaults = { all: true, items: true, lostFound: true, events: true, sports: true, messages: true };
    res.json({ ...defaults, ...(user?.notificationPrefs?.toObject?.() || user?.notificationPrefs || {}) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/notification-prefs', protect, async (req, res) => {
  try {
    const { prefs } = req.body;
    if (!prefs || typeof prefs !== 'object') return res.status(400).json({ error: 'Invalid prefs' });
    const allowed = ['all', 'items', 'lostFound', 'events', 'sports', 'messages'];
    const update = {};
    for (const key of allowed) {
      if (key in prefs) update[`notificationPrefs.${key}`] = Boolean(prefs[key]);
    }
    await User.findByIdAndUpdate(req.user._id, { $set: update });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Seller profile with paginated active listings — must be before /:id
router.get('/:userId/profile', protect, getSellerProfile);

router.get('/:id', getUserById);



export default router;