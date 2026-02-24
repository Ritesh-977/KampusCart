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

router.get('/:id', getUserById);



export default router;