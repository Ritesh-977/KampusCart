import mongoose from 'mongoose';

const imageHashSchema = new mongoose.Schema({
    md5Hash:       { type: String, required: true, unique: true, index: true },
    cloudinaryUrl: { type: String, required: true },
    public_id:     { type: String, required: true },
    referenceCount:{ type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('ImageHash', imageHashSchema);
