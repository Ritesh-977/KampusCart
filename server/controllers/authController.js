import crypto from 'crypto';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/sendEmail.js';

// --- 1. HELPER: Send Token in HTTP-Only Cookie ---
const sendToken = (user, statusCode, res) => {
    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // ⚡ FIXED: Use res.cookie instead of setHeader manually
    // This ensures consistent formatting with the Logout function
    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
        httpOnly: true,
        sameSite: 'lax', 
        secure: false,
        //domain: ".kampuscart.site", // <--- CRITICAL: Must match Logout
        path: "/" // Explicit path ensures no ambiguity
    };

    res.cookie('token', token, options);

    res.status(statusCode).json({
        success: true,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            profilePic: user.profilePic,
            year: user.year
        }
    });
};

// --- REGISTER USER ---
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const collegeDomain = "@mnnit.ac.in";
        if (!email.endsWith(collegeDomain)) {
            return res.status(403).json({ message: "Access restricted to college students only." });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            if (userExists.isVerified) {
                return res.status(400).json({ message: "User already exists. Please login." });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 20 * 60 * 1000;

        let user;

        if (userExists) {
            userExists.name = name;
            userExists.password = hashedPassword;
            userExists.otp = otp;
            userExists.otpExpires = otpExpires;
            user = await userExists.save();
        } else {
            user = await User.create({
                name,
                email,
                password: hashedPassword,
                otp: otp,
                otpExpires: otpExpires,
                isVerified: false
            });
        }

        try {
            await sendEmail({
                email: user.email,
                subject: 'Your College Marketplace Verification Code',
                otp: otp,
                name: name,
            });
            res.status(201).json({ message: "Verification code sent to email!" });
        } catch (err) {
            console.log("NODEMAILER ERROR:", err);
            return res.status(500).json({ message: "Email could not be sent" });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- VERIFY EMAIL ---
export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isVerified) {
            return res.status(200).json({ message: "User already verified" });
        }

        if (!user.otp || user.otp.toString().trim() !== otp.toString().trim()) {
             return res.status(400).json({ message: "Invalid verification code" });
        }

        user.isVerified = true;
        user.otp = undefined;
        await user.save();

        res.status(200).json({ message: "Email verified successfully! You can now login." });

    } catch (error) {
        console.error("Verify Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// --- LOGIN USER ---
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.isVerified) {
            return res.status(401).json({ message: "Please verify your email first!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // --- BAN CHECK LOGIC ---
        if (user.isBanned) {
            const currentDate = new Date();
            if (user.banExpiresAt && currentDate > new Date(user.banExpiresAt)) {
                user.isBanned = false;
                user.banExpiresAt = null;
                await user.save();
            } else {
                let banMessage = 'Your account has been permanently banned.';
                if (user.banExpiresAt) {
                    const expiryDate = new Date(user.banExpiresAt);
                    const diffTime = Math.abs(expiryDate - currentDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    banMessage = `Your account is suspended for ${diffDays} more day(s).`;
                }
                return res.status(403).json({ message: banMessage });
            }
        }

        res.clearCookie('token', { domain: 'api.kampuscart.site', path: '/' });

        // Send Token via Cookie Helper
        sendToken(user, 200, res);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const logoutUser = (req, res) => {
    // 1. Define the base options that apply to all cookies first
    const baseCookieOptions = {
        httpOnly: true,
        sameSite: 'None', 
        secure: true,
        path: "/"
    };

    // 2. Clear the NEW wildcard cookie (.kampuscart.site)
    res.clearCookie('token', { ...baseCookieOptions, domain: ".kampuscart.site" });

    // 3. Clear the OLD specific cookie (api.kampuscart.site)
    res.clearCookie('token', { ...baseCookieOptions, domain: "api.kampuscart.site" });

    // 4. Clear default (no domain specified) just to be safe
    res.clearCookie('token', baseCookieOptions);

    // 5. Send success response
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// --- RESEND OTP ---
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified. Please login." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: "Resend Verification Code - CampusMart",
      otp: otp,    
      name: user.name
    });

    res.status(200).json({ message: "New OTP sent to your email" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- FORGOT PASSWORD ---
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 
    
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'https://kampuscart.site'}/passwordreset/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Reset Your Password - CampusMart",
        resetUrl: resetUrl, 
        name: user.name
      });

      res.status(200).json({ message: "Email sent" });
    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- RESET PASSWORD ---
export const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
   
    if(req.body.password) {
        const importBcrypt = await import('bcryptjs'); 
        const salt = await importBcrypt.default.genSalt(10);
        user.password = await importBcrypt.default.hash(req.body.password, salt);
    }

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};