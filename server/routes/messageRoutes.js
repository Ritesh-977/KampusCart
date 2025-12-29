import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendMessage, allMessages, markMessagesAsRead } from '../controllers/messageController.js';

const router = express.Router();

router.route('/').post(protect, sendMessage);
router.route('/:chatId').get(protect, allMessages);
router.route('/read').put(protect, markMessagesAsRead);

export default router;