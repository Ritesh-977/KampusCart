import express from 'express';
import multer from 'multer';
import { 
    getUserProfile, 
    updateUserProfile, 
    toggleWishlist, 
    getWishlist, 
    getUserById
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

// --- Wishlist Routes ---
router.route('/wishlist')
    .post(protect, toggleWishlist)
    .get(protect, getWishlist);

// Save Expo push token for the logged-in user
router.put('/push-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: [token] });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/subscribe', async (req, res) => {
    try {
        // req.user.id would come from your auth middleware
        const userId = req.body.userId; // Or req.user._id if using middleware
        const subscription = req.body.subscription;

        if (!userId || !subscription) {
            return res.status(400).json({ error: "Missing user ID or subscription object" });
        }

        // Save the subscription object to the user's database record
        await User.findByIdAndUpdate(userId, { pushSubscription: subscription });

        res.status(201).json({ message: "Push subscription saved successfully." });
    } catch (error) {
        console.error("Error saving subscription:", error);
        res.status(500).json({ error: "Server error saving subscription" });
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

router.get('/:id', getUserById);



export default router;