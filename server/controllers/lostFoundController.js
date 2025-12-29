import LostItem from '../models/LostItem.js';

//Report a Lost or Found item
// @route   POST /api/lost-found
export const reportItem = async (req, res) => {
    try {
        const { title, description, category, type, location } = req.body;
        
        const newItem = await LostItem.create({
            title,
            description,
            category,
            type,
            location,
            image: req.file ? req.file.path : null, // Handle image if uploaded
            reporter: req.user.id
        });

        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//Get all Lost/Found items with filters
// @route   GET /api/lost-found
export const getAllLostFound = async (req, res) => {
    try {
        const { type, category } = req.query;
        let query = { status: 'Active' };

        if (type) query.type = type; // Filter by 'Lost' or 'Found'
        if (category) query.category = category;

        const items = await LostItem.find(query)
            .populate('reporter', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markItemResolved = async (req, res) => {
  try {
    const item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if the logged-in user is the one who created the item
    if (item.reporter.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    item.status = 'Resolved';
    await item.save();

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};