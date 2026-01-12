import mongoose from 'mongoose';

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
    profilePic: { type: String, default: "" },
    coverImage: { type: String, default: "" },

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
    banExpiresAt: { type: Date, default: null } // If null & isBanned=true, it's permanent

}, { timestamps: true });

export default mongoose.model('User', userSchema);