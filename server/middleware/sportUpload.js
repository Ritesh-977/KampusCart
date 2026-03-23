import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../utils/cloudinaryConfig.js';

const MAX_MB = 5;

// ── QR code upload (image only) — attached when organizer creates/edits a sport
const qrStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'college_marketplace/sports_qr',
    resource_type: 'image',
    public_id: `qr_${Date.now()}`,
  }),
});

// ── Payment proof (image or PDF) — attached when a student registers
const proofStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: 'college_marketplace/sports_payment',
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
    public_id: `proof_${Date.now()}`,
  }),
});

export const qrUpload = multer({
  storage: qrStorage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPG/PNG images are allowed for QR code.'), false);
  },
});

export const proofUpload = multer({
  storage: proofStorage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only PDF and image files are allowed for payment proof.'), false);
  },
});
