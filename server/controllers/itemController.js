import Item from '../models/Item.js';
import asyncHandler from 'express-async-handler';
import getOrSetCache from '../utils/cacheResponse.js'; // Import your helper
import redis from '../config/redis.js'; // Import redis for manual clearing

// --- HELPER TO CLEAR CACHE ---
// We call this whenever an item is created, updated, or deleted.
// It deletes all keys starting with 'items:' (e.g., items:default, items:{"category":"Books"})
const clearItemCache = async () => {
    try {
        const keys = await redis.keys("items:*"); // Find all item-related keys
        if (keys.length > 0) {
            await redis.del(keys); // Delete them
           // console.log("🧹 Item Cache Cleared!");
        }
    } catch (error) {
        console.error("Cache Clear Error:", error);
    }
};

export const createItem = async (req, res) => {
    try {
        const { title, description, price, category, contactNumber, location, sellerEmail, sellerName } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Please upload at least one image of the item" });
        }

        const imageUrls = req.files.map(file => file.path);

        const newItem = await Item.create({
            title,
            description,
            location,
            price: Number(price),
            category,
            contactNumber,
            sellerEmail,
            sellerName,
            images: imageUrls,
            seller: req.user.id
        });

        // 🧹 CLEAR CACHE so the new item shows up on the home page
        await clearItemCache();

        res.status(201).json(newItem);
    } catch (error) {
        console.error("CREATE ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

export const updateItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Item not found" });

        if (item.seller.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to update this item" });
        }

        let imagesToKeep = [];
        if (req.body.existingImages) {
            imagesToKeep = JSON.parse(req.body.existingImages);
        }
        const newImageUrls = req.files ? req.files.map(file => file.path) : [];
        const finalImages = [...imagesToKeep, ...newImageUrls];

        if (finalImages.length === 0) {
            return res.status(400).json({ message: "At least one image is required" });
        }

        const updateData = {
            title: req.body.title,
            price: Number(req.body.price),
            description: req.body.description,
            location: req.body.location,
            category: req.body.category,
            contactNumber: req.body.contactNumber,
            images: finalImages,
            sellerName: req.body.sellerName,
            sellerEmail: req.body.sellerEmail
        };

        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        // 🧹 CLEAR CACHE
        await clearItemCache();

        res.status(200).json(updatedItem);
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ message: "Server error during update" });
    }
};

export const getItems = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, sortBy } = req.query;

        // 🔑 Generate a unique Cache Key based on the user's query
        // Examples: "items:default" or "items:{"category":"Books"}"
        const queryString = JSON.stringify(req.query);
        const cacheKey = `items:${queryString}`;

        // ⚡ WRAP DB QUERY IN CACHE HELPER
        const items = await getOrSetCache(cacheKey, async () => {
            
            // --- ORIGINAL DB LOGIC START ---
            let query = {};

            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            if (category) {
                const standardCategories = ['Books & Notes', 'Electronics', 'Hostel Essentials', 'Cycles', 'Stationery'];
                if (category === 'Others') {
                    query.category = { $nin: standardCategories };
                } else {
                    query.category = category;
                }
            }

            if (minPrice || maxPrice) {
                query.price = {};
                if (minPrice) query.price.$gte = Number(minPrice);
                if (maxPrice) query.price.$lte = Number(maxPrice);
            }

            let sortOptions = { createdAt: -1 };
            if (sortBy === 'priceLow') sortOptions = { price: 1 };
            if (sortBy === 'priceHigh') sortOptions = { price: -1 };

            // Return the result of the query (this gets saved to Redis)
            return await Item.find(query)
                .populate('seller', 'name email')
                .sort(sortOptions);
            // --- ORIGINAL DB LOGIC END ---
        });

        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getItemById = async (req, res) => {
    try {
        // Optional: You can cache individual items too if you want!
        // Key: item:12345
        const item = await Item.findById(req.params.id).populate('seller', 'name email');
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyItems = async (req, res) => {
    try {
        // No caching here usually (since it's private/dynamic data), but you could if needed.
        const items = await Item.find({ seller: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Item not found" });
        if (item.seller.toString() !== req.user.id) return res.status(401).json({ message: "User not authorized" });

        await item.deleteOne();

        // 🧹 CLEAR CACHE
        await clearItemCache();

        res.status(200).json({ message: "Item removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyListings = async (req, res) => {
    try {
        const myItems = await Item.find({ seller: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ count: myItems.length, items: myItems });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch listings", error: error.message });
    }
};

export const toggleSoldStatus = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Item not found" });
        if (item.seller.toString() !== req.user.id) return res.status(401).json({ message: "Not authorized" });

        item.isSold = !item.isSold;
        await item.save();

        // 🧹 CLEAR CACHE (Important: "Sold" items should disappear from listings)
        await clearItemCache();

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ... Rest of your controllers (getItemsByUser, reportItem) stay the same ...
// You usually don't cache reports or user-specific profiles unless traffic is huge.

export const getItemsByUser = async (req, res) => {
    try {
        const items = await Item.find({ seller: req.params.userId }).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const reportItem = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const item = await Item.findById(req.params.id);

    if (item) {
        if (item.seller.toString() === req.user._id.toString()) {
            res.status(400);
            throw new Error("You cannot report your own item.");
        }
        item.isReported = true;
        item.reportReason = reason;
        item.reportCount = (item.reportCount || 0) + 1;
        const updatedItem = await item.save();
        res.status(200).json({ message: 'Item reported successfully', isReported: updatedItem.isReported });
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});