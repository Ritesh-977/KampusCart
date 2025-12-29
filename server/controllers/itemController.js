import Item from '../models/Item.js';



export const createItem = async (req, res) => {
    try {
        const { title, description, price, category, contactNumber,location,sellerEmail } = req.body;

        // Check if images were actually uploaded (req.files is used for arrays)
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Please upload at least one image of the item" });
        }

        // Map through the array of files to get Cloudinary URLs
        const imageUrls = req.files.map(file => file.path);

        const newItem = await Item.create({
            title,
            description,
            location,
            price: Number(price),
            category,
            contactNumber,
            sellerEmail,
            images: imageUrls, // Now storing an array of strings
            seller: req.user.id
        });

        res.status(201).json(newItem);
    } catch (error) {
        console.error("CREATE ERROR:", error);
        res.status(500).json({ 
            message: "Server Error", 
            error: error.message 
        });
    }
};

export const updateItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Item not found" });

        // Authorization check
        if (item.seller.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to update this item" });
        }

        // 1. Get the list of images the user chose to KEEP
        let imagesToKeep = [];
        if (req.body.existingImages) {
            // existingImages comes as a stringified array from the frontend
            imagesToKeep = JSON.parse(req.body.existingImages);
        }

        // 2. Get the URLs of NEWLY uploaded images from Multer/Cloudinary
        const newImageUrls = req.files ? req.files.map(file => file.path) : [];

        // 3. Merge them into one final array
        const finalImages = [...imagesToKeep, ...newImageUrls];

        // Validation: Don't allow a listing with zero photos
        if (finalImages.length === 0) {
            return res.status(400).json({ message: "At least one image is required" });
        }

        const updateData = {
            title: req.body.title,
            price: Number(req.body.price),
            description: req.body.description,
            location: req.body.location,
            sellerEmail: req.body.sellerEmail,
            category: req.body.category,
            contactNumber: req.body.contactNumber,
            images: finalImages // This now contains both KEPT and NEW images
        };

        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.status(200).json(updatedItem);
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ message: "Server error during update" });
    }
};

// Also adding a logic to "Get All Items" for the home page
export const getItems = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, sortBy } = req.query;
        let query = {};

        // 1. Partial Search Logic (The Fix)
        if (search) {
            // This matches the search string anywhere in the title or description
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // 2. Category Filter
        if (category) {
            const standardCategories = ['Books & Notes', 'Electronics', 'Hostel Essentials', 'Cycles', 'Stationery'];
            
            if (category === 'Others') {
                // If 'Others' is selected, find items whose category is NOT in the standard list
                query.category = { $nin: standardCategories };
            } else {
                // Otherwise, find the exact category match
                query.category = category;
            }
        }

        // 3. Price Filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // 4. Sorting Logic
        let sortOptions = { createdAt: -1 };
        if (sortBy === 'priceLow') sortOptions = { price: 1 };
        if (sortBy === 'priceHigh') sortOptions = { price: -1 };

        const items = await Item.find(query)
            .populate('seller', 'name email')
            .sort(sortOptions);

        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getItemById = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).populate('seller', 'name email');
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyItems = async (req, res) => {
    try {
        // req.user.id comes from the 'protect' middleware
        const items = await Item.find({ seller: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Check if the person deleting is the owner
        if (item.seller.toString() !== req.user.id) {
            return res.status(401).json({ message: "User not authorized to delete this item" });
        }

        await item.deleteOne();
        res.status(200).json({ message: "Item removed from marketplace" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyListings = async (req, res) => {
    try {
        // req.user.id comes from your 'protect' middleware
        const myItems = await Item.find({ seller: req.user.id }).sort({ createdAt: -1 });
        
        res.status(200).json({
            count: myItems.length,
            items: myItems
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch your listings", error: error.message });
    }
};

export const toggleSoldStatus = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Security Check
        if (item.seller.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }

        // Toggle the current boolean value
        item.isSold = !item.isSold;
        await item.save();

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


