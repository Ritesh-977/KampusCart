import User from '../models/User.js';

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
    const user = await User.findById(req.user.id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: "Current password incorrect" });

    // Set new password (the model's 'save' middleware will hash this)
    user.password = newPassword;
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