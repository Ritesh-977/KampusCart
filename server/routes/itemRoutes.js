import express from 'express';
import { upload } from '../middleware/multer.js';
import { protect } from '../middleware/authMiddleware.js';
import { createItem, deleteItem, getItemById, getItems, getMyItems, getMyListings, toggleSoldStatus, updateItem} from '../controllers/itemController.js';

const router = express.Router();

// 1. Post a new item (Protected: User must be logged in)
// 'image' is the name of the field we will use in Postman
router.post('/', protect, upload.array('images', 3), createItem);

// 2. Get all items (Public: Anyone can browse the marketplace)
router.get('/', getItems);

// Get only my items
router.get('/my-items', protect, getMyItems);

router.get('/my-listings', protect, getMyListings);

router.get('/:id', getItemById);

router.put('/:id', protect, upload.array('images', 3), updateItem);

// Delete an item
router.delete('/:id', protect, deleteItem);

// Toggle sold status of an item
router.patch('/:id/status', protect, toggleSoldStatus);

export default router;