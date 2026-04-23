import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category:    {
    type: String,
    enum: ['Technical', 'Cultural', 'Sports', 'Social', 'Academic', 'Arts', 'Music', 'Default'],
    default: 'Default',
  },
  college:     { type: String, required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isVerified:  { type: Boolean, default: false },
}, { timestamps: true });

// Virtual so the frontend receives memberCount without a separate query
clubSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

clubSchema.set('toJSON', { virtuals: true });
clubSchema.set('toObject', { virtuals: true });

export default mongoose.model('Club', clubSchema);
