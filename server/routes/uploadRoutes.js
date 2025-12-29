import express from 'express';
import multer from 'multer';
import { storage } from '../utils/cloudinaryConfig.js'; // Import your existing config

const router = express.Router();

// Initialize Multer with Cloudinary Storage
const upload = multer({ storage });

// Route to handle chat image uploads
// We use 'upload.single("image")' because the Chat sends one file at a time
router.post('/', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Cloudinary puts the URL in 'req.file.path' or 'req.file.secure_url'
        res.status(200).json({
            message: 'Image uploaded',
            // Send this URL back to the frontend
            filePath: req.file.path 
        });
    } catch (error) {
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

export default router;