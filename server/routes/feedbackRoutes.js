import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { submitFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

router.post('/', protect, submitFeedback);

export default router;
