import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    category: {
        type: String,
        enum: ['General', 'Bug Report', 'Feature', 'Other'],
        default: 'General',
    },
    message: { type: String, required: true },
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
