import mongoose from 'mongoose';

const regSchema = new mongoose.Schema({
  sport:          { type: mongoose.Schema.Types.ObjectId, ref: 'Sport', required: true, index: true },
  teamName:       { type: String, required: true, trim: true },
  captainName:    { type: String, required: true, trim: true },
  captainContact: { type: String, required: true, trim: true },
  course:         { type: String, required: true, trim: true },
  year:           { type: String, required: true },       // '1st', '2nd', '3rd', '4th', 'Other'
  paymentProofUrl:  { type: String, default: '' },
  paymentProofType: { type: String, enum: ['image', 'pdf', ''], default: '' },
  registeredBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  college:        { type: String, default: '' },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

// Prevent duplicate registrations from the same user for the same sport
regSchema.index({ sport: 1, registeredBy: 1 }, { unique: true });

export default mongoose.model('SportRegistration', regSchema);
