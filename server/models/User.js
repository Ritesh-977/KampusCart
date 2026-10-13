import mongoose from 'mongoose';
import { deleteFromCloudinary } from '../utils/imageService.js';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: { type: String, required: true },

    // Profile Fields
    phone: { type: String },
    year: { type: String },
    profilePic:  { type: String, default: "" },
    coverImage:  { type: String, default: "" },

    // Avatar strategy: 'default' = DiceBear (no Cloudinary slot used),
    // 'custom' = file uploaded to users/avatar_<id> on Cloudinary.
    avatarType: { type: String, enum: ['default', 'custom'], default: 'default' },
    avatarUrl:  { type: String, default: '' },

    // --- VERIFICATION FIELDS (Standardized) ---
    isVerified: { type: Boolean, default: false },
    otp: { type: String },          // Use this for the 6-digit code
    otpExpires: { type: Date },     // Use this to check expiry
    // ------------------------------------------

    // Password Reset Fields
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // --- NEW: WISHLIST FIELD ---
    // Stores an array of Item IDs
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    }],

    // Admin Flag
    isAdmin: { type: Boolean, default: false },

    // --- NEW BAN FIELDS ---
    isBanned: { type: Boolean, default: false },
    banExpiresAt: { type: Date, default: null }, // If null & isBanned=true, it's permanent

    pushSubscription: {
        type: Array,
        default: []
    },

    notificationPrefs: {
        all:       { type: Boolean, default: true },
        items:     { type: Boolean, default: true },
        lostFound: { type: Boolean, default: true },
        events:    { type: Boolean, default: true },
        sports:    { type: Boolean, default: true },
        messages:  { type: Boolean, default: true },
    },

    college: {
        type: String,
        default: "MNNIT Allahabad"
    },

    lastReminderSentAt: { type: Date, default: null }


}, { timestamps: true });

// ─── Cascade: delete Cloudinary avatar + all owned items when a user is removed ───
userSchema.pre(['findOneAndDelete', 'deleteOne'], { document: false, query: true }, async function () {
    const user = await this.model.findOne(this.getFilter()).select('_id avatarType');
    if (!user) return;

    // 1. Wipe custom avatar from Cloudinary
    if (user.avatarType === 'custom') {
        await deleteFromCloudinary(`users/avatar_${user._id}`, { invalidate: true });
    }

    // 2. Trigger each item's own pre-hook so image refs are decremented correctly
    const Item = (await import('./Item.js')).default;
    const items = await Item.find({ seller: user._id }).select('_id');
    for (const item of items) {
        await Item.findOneAndDelete({ _id: item._id });
    }
});

export default mongoose.model('User', userSchema);