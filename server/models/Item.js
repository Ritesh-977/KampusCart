import mongoose from 'mongoose';
import { decrementOrDelete } from '../utils/imageService.js';

const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: false },
    price: { type: Number, required: true },
    category: {
        type: String,
        required: true
    },
    // All documents migrated to {url, public_id} via migrate-images.mjs.
    images: [{
        url:       { type: String, required: true },
        public_id: { type: String, required: true },
    }],
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

    college: {
        type: String,
        required: true,
        index: true // Add an index because we will filter by this a lot!
    },
    
    idempotencyKey: {
    type: String,
    unique: true,
    sparse: true // This is crucial! It allows old items without this key to still exist
}

}, { timestamps: true });

itemSchema.index({ title: 'text', description: 'text' });

// ─── Cascade: decrement / delete Cloudinary assets when an item is removed ───
itemSchema.pre(['findOneAndDelete', 'deleteOne'], { document: false, query: true }, async function () {
    const item = await this.model.findOne(this.getFilter()).select('images');
    if (!item) return;
    // Process each image through the deduplication decrement routine
    await Promise.all(item.images.map(img => decrementOrDelete(img.public_id)));
});

export default mongoose.model('Item', itemSchema);