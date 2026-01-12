import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import { 
    getAdminStats, 
    getAllUsers, 
    deleteUser, 
    banUser,        // <--- Added banUser
    getAllItems, 
    deleteItemAdmin, 
    getReportedItems,
    dismissReport
} from '../controllers/adminController.js';

const router = express.Router();

// --- Dashboard Statistics ---
router.get('/stats', protect, admin, getAdminStats);

// --- User Management ---
router.get('/users', protect, admin, getAllUsers);
router.delete('/users/:id', protect, admin, deleteUser);
router.put('/users/:id/ban', protect, admin, banUser); // <--- Ban Route

// --- Item Management ---
router.get('/items', protect, admin, getAllItems);
router.delete('/items/:id', protect, admin, deleteItemAdmin);

// Add Reports Route
router.get('/reports', protect, admin, getReportedItems);

// Add Dismiss Route
router.put('/items/:id/dismiss-report', protect, admin, dismissReport);

export default router;