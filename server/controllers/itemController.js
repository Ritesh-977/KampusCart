import Item from '../models/Item.js';
import asyncHandler from 'express-async-handler';
import getOrSetCache from '../utils/cacheResponse.js';
import redis from '../config/redis.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendPushToCollege }      from '../utils/expoPush.js';
import { sendWebPushToCollege }   from '../utils/webPushService.js';
import { NOTIFICATION_TYPES } from '../utils/notificationHelper.js';

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

        const college       = req.user.college;
        const excludeUserId = req.user._id || req.user.id;
        const notifTitle    = 'New listing on campus 🛒';
        const notifBody     = `${title} listed for ₹${price} · ${category}`;
        const notifData     = { type: 'item', itemId: String(newItem._id) };
        const itemUrl       = `/item/${newItem._id}`;

        // 1. Mobile Expo push (backgrounded/killed app)
        sendPushToCollege({
            college, excludeUserId, prefKey: 'items',
            title: notifTitle, body: notifBody, data: notifData,
        });

        // 2. Web browser push (backgrounded tab / OS notification)
        sendWebPushToCollege({
            college, excludeUserId, prefKey: 'items',
            title: notifTitle, body: notifBody,
            url: itemUrl, icon: imageUrls[0],
        });

        // 3. Bulk-insert in-app notifications for all college users (single DB write)
        const io = req.app.get('io');
        const users = await User.find({ college, _id: { $ne: excludeUserId } }).select('_id');
        if (users.length > 0) {
            const notifications = users.map(user => ({
                userId: user._id,
                title: notifTitle,
                message: notifBody,
                type: NOTIFICATION_TYPES.ITEM,
                link: itemUrl,
                metadata: {}
            }));
            await Notification.insertMany(notifications, { ordered: false });

            // Single broadcast to the college room — all subscribed sockets receive it at once
            if (io) {
                io.to(`college:${college}`).emit('new_notification', {
                    title: notifTitle,
                    message: notifBody,
                    type: NOTIFICATION_TYPES.ITEM,
                    link: itemUrl,
                });
            }
        }

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
        const { search, category, minPrice, maxPrice, sortBy, college, page = 1, limit = 12 } = req.query;

        if (!college) {
            return res.status(400).json({ message: "Please select a college to view items." });
        }

        const pageNum  = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip     = (pageNum - 1) * limitNum;

        const queryString = JSON.stringify(req.query);
        const cacheKey = `items:${college}:${queryString}`;

        const result = await getOrSetCache(cacheKey, async () => {

            const collegeFilter = { college };
            let dbQuery = { ...collegeFilter };

            const standardCategories = ['Books & Notes', 'Electronics', 'Hostel Essentials', 'Cycles', 'Stationery'];
            const categoryFilter = category
                ? category === 'Others'
                    ? { category: { $nin: standardCategories } }
                    : { category }
                : null;

            const categoryAliases = [
                { pattern: /\bbooks?\b|\bnotes?\b/i, category: 'Books & Notes' },
                { pattern: /\belectronics?\b|\blaptops?\b|\bphones?\b/i, category: 'Electronics' },
                { pattern: /\bcycles?\b|\bbicycles?\b/i, category: 'Cycles' },
                { pattern: /\bhostel\b|\bessentials?\b/i, category: 'Hostel Essentials' },
                { pattern: /\bstationery\b|\bpens?\b|\bpencils?\b/i, category: 'Stationery' },
            ];

            if (search) {
                const matchedCategory = categoryAliases.find(a => a.pattern.test(search))?.category;
                const searchOr = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } },
                ];
                if (matchedCategory) searchOr.push({ category: matchedCategory });
                dbQuery = {
                    $and: [
                        collegeFilter,
                        { isSold: { $ne: true } },
                        { $or: searchOr },
                        ...(categoryFilter ? [categoryFilter] : []),
                    ]
                };
            } else if (categoryFilter) {
                dbQuery = { ...collegeFilter, ...categoryFilter };
            }

            if (minPrice || maxPrice) {
                dbQuery.price = {};
                if (minPrice) dbQuery.price.$gte = Number(minPrice);
                if (maxPrice) dbQuery.price.$lte = Number(maxPrice);
            }

            let sortOptions = { isSold: 1, createdAt: -1 };
            if (sortBy === 'priceLow')  sortOptions = { isSold: 1, price:  1 };
            if (sortBy === 'priceHigh') sortOptions = { isSold: 1, price: -1 };

            const [items, total] = await Promise.all([
                Item.find(dbQuery).populate('seller', 'name email').sort(sortOptions).skip(skip).limit(limitNum),
                Item.countDocuments(dbQuery),
            ]);

            return { items, total, page: pageNum, limit: limitNum, hasMore: skip + items.length < total };
        });

        res.status(200).json(result);
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
        const item = await Item.findById(req.params.id).populate('seller', 'name');
        if (!item) return res.status(404).json({ message: "Item not found" });
        if (item.seller._id.toString() !== req.user.id) return res.status(401).json({ message: "Not authorized" });

        item.isSold = !item.isSold;
        await item.save();

        // 🧹 CLEAR CACHE
        await clearItemCache(req.user.college);

        // Notify users who have this item in wishlist
        if (item.isSold) {
            const io = req.app.get('io');
            const usersWithWishlist = await User.find({ wishlist: item._id }).select('_id');
            
            for (const user of usersWithWishlist) {
                await createNotification(io, user._id, {
                    title: 'Wishlist Item Sold 🛍️',
                    message: `"${item.title}" has been marked as sold`,
                    type: NOTIFICATION_TYPES.ITEM,
                    link: `/item/${item._id}`
                });
            }
        }

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const suggestItems = async (req, res) => {
    try {
        const { q, college } = req.query;

        if (!q || q.trim().length === 0) return res.status(200).json([]);
        if (!college) return res.status(400).json({ message: 'college query param is required' });

        const trimmed = q.trim();

        // Try $text index first (fast, scored, whole-word matches)
        let items = await Item.find(
            { college, isSold: { $ne: true }, $text: { $search: trimmed } },
            { score: { $meta: 'textScore' }, title: 1, category: 1, images: 1, price: 1 }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(6)
            .lean();

        // Fallback to prefix regex when $text returns nothing
        // (handles partial words like "Cyc" → "Cycle")
        if (items.length === 0) {
            const categoryAliases = [
                { pattern: /\bbooks?\b|\bnotes?\b/i, category: 'Books & Notes' },
                { pattern: /\belectronics?\b|\blaptops?\b|\bphones?\b/i, category: 'Electronics' },
                { pattern: /\bcycles?\b|\bbicycles?\b/i, category: 'Cycles' },
                { pattern: /\bhostel\b|\bessentials?\b/i, category: 'Hostel Essentials' },
                { pattern: /\bstationery\b|\bpens?\b|\bpencils?\b/i, category: 'Stationery' },
            ];
            const matchedCategory = categoryAliases.find(a => a.pattern.test(trimmed))?.category;
            const orConditions = [
                { title: { $regex: trimmed, $options: 'i' } },
                { category: { $regex: trimmed, $options: 'i' } },
            ];
            if (matchedCategory) orConditions.push({ category: matchedCategory });

            items = await Item.find(
                { college, isSold: { $ne: true }, $or: orConditions },
                { title: 1, category: 1, images: 1, price: 1 }
            )
                .limit(6)
                .lean();
        }

        res.status(200).json(items);
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