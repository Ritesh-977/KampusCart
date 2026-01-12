import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;

    // 1. CHECK COOKIES (Primary Secure Method)
    if (req.cookies.token) {
        token = req.cookies.token;
    }
    // 2. CHECK HEADERS (Fallback Method)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // 3. IF NO TOKEN FOUND
    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    try {
        // 4. VERIFY TOKEN
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 5. GET USER
        const user = await User.findById(decoded.id).select('-password');

        // 6. CHECK IF USER EXISTS
        if (!user) {
            res.status(401);
            throw new Error('Not authorized, user not found');
        }

        // 7. BAN CHECK LOGIC (Preserved)
        if (user.isBanned) {
            if (user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
                // Auto-unban
                user.isBanned = false;
                user.banExpiresAt = null;
                await user.save();
            } else {
                // Still banned
                res.status(403); // Forbidden
                const msg = user.banExpiresAt 
                    ? `Account suspended until ${new Date(user.banExpiresAt).toLocaleDateString()}` 
                    : 'Your account has been permanently banned.';
                throw new Error(msg);
            }
        }

        // 8. ATTACH USER & PROCEED
        req.user = user;
        next();

    } catch (error) {
        console.error("Auth Error:", error.message);
        
        // Respect existing status code (e.g., 403 for bans), otherwise default to 401
        const statusCode = res.statusCode === 200 ? 401 : res.statusCode;
        
        res.status(statusCode).json({ 
            message: error.message || "Not authorized, token failed" 
        });
    }
};