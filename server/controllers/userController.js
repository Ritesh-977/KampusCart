import User from '../models/User.js';
import Item from '../models/Item.js';
import bcrypt from 'bcryptjs';

//Get user profile
// @route   GET /api/users/profile
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update user profile
// @route   PUT /api/users/profile
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            // 1. Update text fields
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            user.year = req.body.year || user.year;
            
            // 2. Handle Password
            if (req.body.password) {
                user.password = req.body.password; 
            }

            // 3. Handle Images (Updated for Multiple Files)
            // 'upload.fields' puts files in 'req.files' (plural) as an object
            if (req.files) {
                // Check if Profile Pic was uploaded
                if (req.files.profilePic) {
                    // It comes as an array, so we take the first one [0]
                    user.profilePic = req.files.profilePic[0].path; 
                }

                // Check if Cover Image was uploaded
                if (req.files.coverImage) {
                    user.coverImage = req.files.coverImage[0].path;
                }
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                year: updatedUser.year,
                profilePic: updatedUser.profilePic,
                coverImage: updatedUser.coverImage, // <--- Return this to frontend
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// userController.js

// 1. Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Delete Account
export const deleteAccount = async (req, res) => {
  try {
    // Delete user's items first to clean up database
    await Item.deleteMany({ seller: req.user.id });
    
    // Delete the user
    await User.findByIdAndDelete(req.user.id);
    
    res.status(200).json({ message: "Account and listings deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// server/controllers/userController.js

// Toggle Wishlist (Add if not there, Remove if it is)
export const toggleWishlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const itemId = req.body.itemId;

        if (user.wishlist.includes(itemId)) {
            // Remove
            user.wishlist = user.wishlist.filter(id => id.toString() !== itemId);
            await user.save();
            res.status(200).json({ message: 'Removed from wishlist', wishlist: user.wishlist });
        } else {
            // Add
            user.wishlist.push(itemId);
            await user.save();
            res.status(200).json({ message: 'Added to wishlist', wishlist: user.wishlist });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get User's Wishlist
export const getWishlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist');
        res.status(200).json(user.wishlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/users/:userId/profile
 * Public seller profile: safe user fields + paginated active listings.
 *
 * Query params:
 *   page  (default 1)
 *   limit (default 10, capped at 20)
 */
export const getSellerProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip  = (page - 1) * limit;

    // Exclude every field that must never leave the server
    const user = await User.findById(userId).select(
      '-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire ' +
      '-wishlist -pushSubscription -notificationPrefs -isBanned -banExpiresAt -isAdmin'
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only show active (non-sold) listings, newest first
    const filter = { seller: userId, isSold: false };

    const [items, total] = await Promise.all([
      Item.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Item.countDocuments(filter),
    ]);

    res.json({
      user,
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + items.length < total,
      },
    });
  } catch (error) {
    console.error('[getSellerProfile]', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -otp -otpExpires -wishlist'); // Exclude private info

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};