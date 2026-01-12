import User from '../models/User.js';
import Item from '../models/Item.js';
import asyncHandler from 'express-async-handler';

// @desc    Get dashboard stats (Users, Items, Sold Items)
// @route   GET /api/admin/stats
export const getAdminStats = async (req, res) => {
    try {
        const usersCount = await User.countDocuments({ isVerified: true });
        const itemsCount = await Item.countDocuments();
        const soldItemsCount = await Item.countDocuments({ isSold: true });

        res.json({ usersCount, itemsCount, soldItemsCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Optional: Prevent deleting other admins
        if (user.isAdmin) {
            return res.status(400).json({ message: 'Cannot delete an Admin account' }); 
        }

        await user.deleteOne();
        res.json({ message: 'User removed' });
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Ban, Temporarily Ban, or Unban user
// @route   PUT /api/admin/users/:id/ban
export const banUser = async (req, res) => {
    try {
        const { banType } = req.body; // Expects: 'permanent', 'temporary', or 'unban'
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isAdmin) {
            return res.status(400).json({ message: 'Cannot ban an Admin' });
        }

        if (banType === 'permanent') {
            user.isBanned = true;
            user.banExpiresAt = null; // Null means forever
        } else if (banType === 'temporary') {
            user.isBanned = true;
            // Set expire date to 7 days from now
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            user.banExpiresAt = sevenDaysFromNow;
        } else if (banType === 'unban') {
            user.isBanned = false;
            user.banExpiresAt = null;
        } else {
            return res.status(400).json({ message: 'Invalid ban type' });
        }

        await user.save();
        
        res.json({ 
            message: `User ${banType === 'unban' ? 'unbanned' : 'banned'} successfully`,
            isBanned: user.isBanned,
            banExpiresAt: user.banExpiresAt
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all items
// @route   GET /api/admin/items
export const getAllItems = async (req, res) => {
    try {
        const items = await Item.find({})
            .populate('seller', 'name email')
            .sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete item (Admin force delete)
// @route   DELETE /api/admin/items/:id
export const deleteItemAdmin = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        
        if (item) {
            await item.deleteOne();
            res.json({ message: 'Item removed by Admin' });
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getReportedItems = asyncHandler(async (req, res) => {
    const items = await Item.find({ isReported: true })
                            .populate('seller', 'name email')
                            // 👇 SORT BY COUNT (Descending: Highest first)
                            .sort({ reportCount: -1, updatedAt: -1 });
    res.json(items);
});

export const dismissReport = asyncHandler(async (req, res) => {
    const item = await Item.findById(req.params.id);

    if (item) {
        item.isReported = false;
        item.reportReason = ""; // Clear the reason
        await item.save();
        res.json({ message: 'Report dismissed' });
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});