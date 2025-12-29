import express from 'express';
import multer from 'multer';
import { 
    getUserProfile, 
    updateUserProfile, 
    toggleWishlist, 
    getWishlist 
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

// 1. Import the storage you defined in utils/cloudinary.js
import { storage } from '../utils/cloudinaryConfig.js';

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

export default router;