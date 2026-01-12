import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: false },
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
    },
    isSold: { type: Boolean, default: false },
    contactNumber: { type: String, required: true },

    // 👇 ADDED THESE FIELDS TO STORE CUSTOM INFO
    sellerEmail: { type: String },
    sellerName: { type: String }, // <--- This was missing!

    isReported: {
        type: Boolean,
        default: false,
    },
    reportReason: {
        type: String,
        default: "",
    },
    reportCount: {
        type: Number,
        default: 0, 
    },
}, { timestamps: true });

itemSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Item', itemSchema);