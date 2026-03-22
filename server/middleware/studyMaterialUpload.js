import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../utils/cloudinaryConfig.js'; // reuse already-configured instance

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE_MB  = 10;

// Separate Cloudinary storage bucket for study materials
const studyStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'college_marketplace/study_materials',
    // 'raw' for PDFs so Cloudinary preserves the binary; 'image' for images
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
    // unique public_id to avoid collisions
    public_id: `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`,
  }),
});

export const studyMaterialUpload = multer({
  storage: studyStorage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files (jpg, png) are allowed.'), false);
    }
  },
});
