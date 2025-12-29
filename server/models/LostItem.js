import mongoose from 'mongoose';

const lostItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['ID Card', 'Keys', 'Electronics', 'Books', 'Other'], 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['Lost', 'Found'], 
        required: true 
    },
    location: { type: String, required: true }, // e.g., "Library", "Canteen"
    image: { type: String }, // URL from Cloudinary/Multer
    reporter: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Active', 'Resolved'], 
        default: 'Active' 
    },
}, { timestamps: true });

const LostItem = mongoose.model('LostItem', lostItemSchema);
export default LostItem;