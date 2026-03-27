import Item from '../models/Item.js';
import asyncHandler from 'express-async-handler';
import getOrSetCache from '../utils/cacheResponse.js';
import redis from '../config/redis.js';
import webpush from '../utils/webPush.js';
import User from '../models/User.js';
import { sendPushToCollege } from '../utils/expoPush.js';

// --- HELPER TO CLEAR CACHE (Updated for Multi-College) ---
const clearItemCache = async (college) => {
    try {
        const keys = await redis.keys(`items:${college}:*`);
        if (keys.length > 0) {
            await redis.del(keys);
            // console.log(`🧹 Item Cache Cleared for ${college}!`);
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
            seller: req.user.id,
            college: req.user.college // <--- Secured: Tied to the logged-in seller's college
        });

        // 🧹 CLEAR CACHE only for this user's college
        await clearItemCache(req.user.college);

        // 👇 --- NEW: MULTI-DEVICE BROADCAST --- 👇
        const sendPushNotifications = async () => {
            try {
                const frontendUrl = 'https://www.kampuscart.site'; // Change to your actual frontend URL
                const payload = JSON.stringify({
                    title: 'New Deal on KampusCart! 🛒',
                    body: `${title} was just listed for ₹${price} in ${category}.`,
                    url: `${frontendUrl}/item/${newItem._id}`,
                    icon: imageUrls[0],
                    image: imageUrls[0]
                });

                const currentUserId = req.user._id || req.user.id;

                // 1. Find users who have AT LEAST one device subscribed
                const subscribedUsers = await User.find({
                    pushSubscriptions: { $exists: true, $not: { $size: 0 } },
                    _id: { $ne: currentUserId } 
                });

                const pushPromises = [];

                // 2. Loop through every user...
                subscribedUsers.forEach(user => {
                    // ...and loop through every device they own!
                    user.pushSubscriptions.forEach(sub => {
                        const promise = webpush.sendNotification(sub, payload)
                            .catch(async (error) => {
                                // If a user uninstalls the browser on one device, remove JUST that device
                                if (error.statusCode === 410 || error.statusCode === 404) {
                                    console.log(`Cleaning up dead device for user: ${user.email}`);
                                    await User.findByIdAndUpdate(user._id, { 
                                        $pull: { pushSubscriptions: sub } 
                                    });
                                } else {
                                    console.error(`Push error for ${user.email}:`, error);
                                }
                            });
                        pushPromises.push(promise);
                    });
                });

                // Fire them all at once
                await Promise.all(pushPromises);
                console.log(`Successfully broadcasted push alerts to ${pushPromises.length} devices.`);
            } catch (pushError) {
                console.error("Fatal error broadcasting push notifications:", pushError);
            }
        };

        sendPushNotifications();

        // Mobile Expo push
        sendPushToCollege({
            college: req.user.college,
            excludeUserId: req.user._id || req.user.id,
            prefKey: 'items',
            title: 'New listing on campus 🛒',
            body: `${title} listed for ₹${price} · ${category}`,
            data: { type: 'item', itemId: String(newItem._id) },
        });

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

        // 🧹 CLEAR CACHE for this college
        await clearItemCache(req.user.college);

        res.status(200).json(updatedItem);
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ message: "Server error during update" });
    }
};

export const getItems = async (req, res) => {
    try {
        // ⚡ EXTRACT COLLEGE FROM QUERY (URL) NOT FROM LOGGED IN USER
        const { search, category, minPrice, maxPrice, sortBy, college } = req.query;

        // 🛡️ SAFETY CHECK: Ensure the frontend actually requested a college
        if (!college) {
            return res.status(400).json({ message: "Please select a college to view items." });
        }

        // 🔑 Generate Cache Key tied specifically to the requested college
        const queryString = JSON.stringify(req.query);
        const cacheKey = `items:${college}:${queryString}`;

        // ⚡ WRAP DB QUERY IN CACHE HELPER
        const items = await getOrSetCache(cacheKey, async () => {

            // --- DATA ISOLATION: Match college OR legacy items with no college field ---
            // --- STRICT DATA ISOLATION: ONLY match the exact requested college ---
            const collegeFilter = { college: college };
            let query = { ...collegeFilter };

            if (search) {
                // Can't have two $or at top level — combine with $and
                query = {
                    $and: [
                        collegeFilter,
                        { $or: [
                            { title: { $regex: search, $options: 'i' } },
                            { description: { $regex: search, $options: 'i' } }
                        ]}
                    ]
                };
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

            return await Item.find(query)
                .populate('seller', 'name email')
                .sort(sortOptions);
        });

        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getItemById = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).populate('seller', 'name email');
        if (!item) return res.status(404).json({ message: "Item not found" });

        // 🛡️ SECURITY CHECK 1: Ensure the user is logged in (req.user exists)
        if (!req.user) {
            return res.status(401).json({ message: "Please log in to view item details." });
        }

        // 🛡️ SECURITY CHECK 2: Ensure the item belongs to the user's college
        if (item.college && item.college !== req.user.college) {
            return res.status(403).json({ message: "Access denied. This item belongs to another college marketplace." });
        }

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyItems = async (req, res) => {
    try {
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
        await clearItemCache(req.user.college);

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

        // 🧹 CLEAR CACHE
        await clearItemCache(req.user.college);

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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