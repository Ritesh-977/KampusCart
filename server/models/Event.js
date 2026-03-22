import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  location:    { type: String, required: true },
  startTime:   { type: Date, required: true },
  duration:    { type: Number, default: 60 }, // minutes
  organizer: {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:  { type: String, required: true },
    phone: { type: String, default: '' },
  },
  college: { type: String, required: true },
  color:   { type: String, default: '#6366f1' },
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
