import express from 'express';
import { reportItem, getAllLostFound, markItemResolved } from '../controllers/lostFoundController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/multer.js';

const router = express.Router();

router.get('/', getAllLostFound);
router.post('/', protect, upload.single('image'), reportItem);
router.put('/:id/resolve', protect, markItemResolved);

export default router;
