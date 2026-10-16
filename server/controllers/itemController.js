import Item from '../models/Item.js';
import asyncHandler from 'express-async-handler';
import getOrSetCache from '../utils/cacheResponse.js';
import redis from '../config/redis.js';
import User from '../models/User.js';
import { sendPushToCollege }      from '../utils/expoPush.js';
import { sendWebPushToCollege }   from '../utils/webPushService.js';
import { createNotification, NOTIFICATION_TYPES } from '../utils/notificationHelper.js';
import { deduplicateAndStage, promoteImage, decrementOrDelete } from '../utils/imageService.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose'; // Ensure this is imported at the top

const clearItemCache = async (college) => {
    try {
        const keys = await redis.keys(`items:${college}:*`);
        if (keys.length > 0) {
            await redis.del(keys);
        }
    } catch (error) {
        console.error("Cache Clear Error:", error);
    }
};


export const createItem = async (req, res) => {
    try {
        const { title, description, price, category, contactNumber, location, sellerEmail, sellerName } = req.body;
        const idempotencyKey = req.headers['x-idempotency-key'];

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one image of the item' });
        }

        // 1. Generate the item ID upfront so we can create permanent Cloudinary IDs
        const itemId = new mongoose.Types.ObjectId();

        // 2. Hash + deduplicate + upload to temp/
        const stagedImages = await Promise.all(
            req.files.map(async (file) => {
                const tempId = `temp/${uuidv4()}`;
                return await deduplicateAndStage(file.buffer, tempId);
            })
        );

        // 3. Promote temp/ → items/ BEFORE DB save
        const finalImages = await Promise.all(
            stagedImages.map(async (img, idx) => {
                if (!img.isNew) return img; // Dedup reused an existing image
                const permanentId = `items/${itemId}_${idx}`;
                return await promoteImage(img.public_id, permanentId);
            })
        );

        // 4. Single, final DB write
        const newItem = await Item.create({
            _id: itemId, // Use the pre-generated ID
            title, description, location, price: Number(price),
            category, contactNumber, sellerEmail, sellerName,
            images: finalImages.map(img => ({ url: img.url, public_id: img.public_id })),
            seller: req.user.id,
            college: req.user.college,
            idempotencyKey,
        });

        await clearItemCache(req.user.college);
        res.status(201).json(newItem);

        // ... Keep your background notification logic here ...

    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
            console.warn('[KampusCart] Duplicate request blocked by idempotency key.');
            if (!res.headersSent) return res.status(200).json({ message: 'Item already created' });
            return;
        }
        console.error('CREATE ERROR:', error);
        if (!res.headersSent) res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (item.seller.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to update this item' });
        }

        const keepIds = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
        const orphans = item.images.filter(img => !keepIds.includes(img.public_id));

        // 1. Process new uploads to temp/ ONLY
        const stagedNewImages = req.files?.length
            ? await Promise.all(
                req.files.map(async (file) => {
                    const tempId = `temp/${uuidv4()}`;
                    return await deduplicateAndStage(file.buffer, tempId);
                })
              )
            : [];

        const keptImages = item.images.filter(img => keepIds.includes(img.public_id));
        const DB_Images = [
            ...keptImages,
            ...stagedNewImages.map(img => ({ url: img.url, public_id: img.public_id }))
        ];

        if (DB_Images.length === 0) {
            return res.status(400).json({ message: 'At least one image is required' });
        }

        // 2. Perform DB Update First
        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title, price: Number(req.body.price),
                description: req.body.description, location: req.body.location,
                category: req.body.category, contactNumber: req.body.contactNumber,
                sellerName: req.body.sellerName, sellerEmail: req.body.sellerEmail,
                images: DB_Images,
            },
            { new: true }
        );

        // 3. Promote temp images ONLY after DB succeeds
        const finalPromotedImages = await Promise.all(
            stagedNewImages.map(async (img, idx) => {
                if (!img.isNew) return img;
                const permanentId = `items/${item._id}_upd_${Date.now()}_${idx}`;
                return await promoteImage(img.public_id, permanentId);
            })
        );

        // 4. If any promotions happened, patch the DB one last time
        if (finalPromotedImages.some(img => img.isNew)) {
            updatedItem.images = [
                ...keptImages,
                ...finalPromotedImages.map(img => ({ url: img.url, public_id: img.public_id }))
            ];
            await updatedItem.save();
        }

        // 5. Delete the orphans safely at the end
        await Promise.all(orphans.map(img => decrementOrDelete(img.public_id)));

        await clearItemCache(req.user.college);
        res.status(200).json(updatedItem);
    } catch (error) {
        console.error('UPDATE ERROR:', error);
        res.status(500).json({ message: 'Server error during update' });
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

            // --- STRICT DATA ISOLATION: ONLY match the exact requested college ---
            const collegeFilter = { college: college };
            let query = { ...collegeFilter };

            if (search) {
                // Combine filters: Must match college, MUST NOT be sold, and must match search regex
                query = {
                    $and: [
                        collegeFilter,
                        { isSold: { $ne: true } }, // 🛑 Hide sold items from search results
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

            // 👇 Sort: isSold=false (0) comes before isSold=true (1)
            let sortOptions = { isSold: 1, createdAt: -1 }; 
            if (sortBy === 'priceLow') sortOptions = { isSold: 1, price: 1 };
            if (sortBy === 'priceHigh') sortOptions = { isSold: 1, price: -1 };

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
        const item = await Item.findById(req.params.id).populate('seller', 'name email profilePic');
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
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (item.seller.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // findOneAndDelete triggers the Item pre-hook which runs decrementOrDelete
        // on every image — no manual Cloudinary calls needed here.
        await Item.findOneAndDelete({ _id: item._id });

        await clearItemCache(req.user.college);
        res.status(200).json({ message: 'Item removed' });
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