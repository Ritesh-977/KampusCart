import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Assuming you have auth middleware
import { accessChat, fetchChats } from '../controllers/chatController.js';

const router = express.Router();

router.route('/').post(protect, accessChat);
router.route('/').get(protect, fetchChats);

export default router;