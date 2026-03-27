import Feedback from '../models/Feedback.js';

// @desc   Submit feedback
// @route  POST /api/feedback
export const submitFeedback = async (req, res) => {
    const { rating, category, message } = req.body;
    if (!rating || !message) {
        return res.status(400).json({ message: 'Rating and message are required.' });
    }
    try {
        const feedback = await Feedback.create({
            user: req.user._id,
            rating,
            category: category || 'General',
            message,
        });
        res.status(201).json(feedback);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc   Get all feedback (admin)
// @route  GET /api/admin/feedback
export const getAllFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('user', 'name email college')
            .sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
