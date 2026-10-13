// server/middleware/multer.js
import multer from 'multer';

// memoryStorage keeps files as Buffer in req.file.buffer / req.files[].buffer.
// This is required for MD5 hashing before any Cloudinary upload.
// The old CloudinaryStorage approach uploaded blindly without deduplication checks.
const memStorage = multer.memoryStorage();

export const upload = multer({ storage: memStorage });

// Single-file upload for profile avatar (used by updateProfilePicture)
export const uploadAvatar = multer({ storage: memStorage, limits: { fileSize: 5 * 1024 * 1024 } });