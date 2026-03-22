import express from 'express';
import {
  uploadMaterial,
  getMaterials,
  deleteMaterial,
} from '../controllers/studyMaterialController.js';
import { protect } from '../middleware/authMiddleware.js';
import { studyMaterialUpload } from '../middleware/studyMaterialUpload.js';

const router = express.Router();

// Public  – browse / filter materials
router.get('/', getMaterials);

// Protected – upload a new material (file field name must be 'file')
router.post(
  '/upload',
  protect,
  studyMaterialUpload.single('file'),
  uploadMaterial
);

// Protected – delete (uploader or admin)
router.delete('/:id', protect, deleteMaterial);

export default router;
