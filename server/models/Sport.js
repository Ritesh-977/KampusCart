import mongoose from 'mongoose';

const SPORT_TYPES = [
  'Cricket', 'Football', 'Basketball', 'Volleyball',
  'Badminton', 'Table Tennis', 'Chess', 'Athletics', 'Kabaddi', 'Other',
];

const sportSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  sportType: { type: String, enum: SPORT_TYPES, required: true },
  description: { type: String, trim: true, default: '' },
  venue: { type: String, required: true, trim: true },
  eventDate: { type: Date, required: true },
  lastRegistrationDate: { type: Date, required: true },
  teamSize: { type: Number, default: 1, min: 1 },       // 1 = individual
  maxTeams: { type: Number },                            // optional cap
  registrationFee: { type: Number, default: 0, min: 0 },
  qrCodeUrl: { type: String, default: '' },              // payment QR image
  rules: { type: String, default: '' },
  organizer: {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:  { type: String, required: true },
    phone: { type: String, default: '' },
  },
  college: { type: String, required: true, index: true },
  isOpen:  { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Sport', sportSchema);
