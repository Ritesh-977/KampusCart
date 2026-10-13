import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Legacy CloudinaryStorage — only kept for the old profile update route in userRoutes.js.
// New uploads (items + avatar) go through imageService.js with memoryStorage.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'college_marketplace/items',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    // No forced transformation — preserve original dimensions
  },
});

export { cloudinary, storage };