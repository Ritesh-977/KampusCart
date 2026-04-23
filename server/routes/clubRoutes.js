import express from 'express';
import {
  getClubs, getMyClubs, createClub,
  joinClub, leaveClub, deleteClub,
} from '../controllers/clubController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',          getClubs);
router.get('/my-clubs',  protect, getMyClubs);
router.post('/',         protect, createClub);
router.post('/:id/join', protect, joinClub);
router.post('/:id/leave',protect, leaveClub);
router.delete('/:id',    protect, deleteClub);

export default router;
