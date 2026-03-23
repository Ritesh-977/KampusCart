import express from 'express';
import {
  getSports, getSport, createSport, updateSport, deleteSport,
  registerForSport, getRegistrations, updateRegistrationStatus,
} from '../controllers/sportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { qrUpload, proofUpload } from '../middleware/sportUpload.js';

const router = express.Router();

router.get('/',    getSports);
router.post('/',   protect, qrUpload.single('qrCode'), createSport);

router.get('/:id',    getSport);
router.put('/:id',    protect, qrUpload.single('qrCode'), updateSport);
router.delete('/:id', protect, deleteSport);

router.post('/:id/register',                       protect, proofUpload.single('paymentProof'), registerForSport);
router.get('/:id/registrations',                   protect, getRegistrations);
router.patch('/:id/registrations/:regId',          protect, updateRegistrationStatus);

export default router;
