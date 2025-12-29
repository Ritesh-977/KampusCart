import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: false },
    sellerEmail: { type: String },
    price: { type: Number, required: true },
    category: { 
        type: String, 
        required: true 
    },
    images: [{ type: String }], // Array of Cloudinary URLs
    seller: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }, // Links the item to the person who posted it
    isSold: { type: Boolean, default: false },
    contactNumber: { type: String, required: true }
}, { timestamps: true });

itemSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Item', itemSchema);