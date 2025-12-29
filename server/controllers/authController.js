import crypto from 'crypto';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/sendEmail.js';

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Domain Check
        const collegeDomain = "@mnnit.ac.in";
        if (!email.endsWith(collegeDomain)) {
            return res.status(403).json({ message: "Access restricted to college students only." });
        }

        // 2. Check User Status
        const userExists = await User.findOne({ email });

        if (userExists) {
            // If user is already verified, they truly "already exist"
            if (userExists.isVerified) {
                return res.status(400).json({ message: "User already exists. Please login." });
            }
            // If user exists but is NOT verified, we will "Update" them below instead of creating a new one
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Generate 6-digit code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 20 * 60 * 1000;

        let user;

        if (userExists) {
            // UPDATE existing unverified user with new details and new OTP
            userExists.name = name;
            userExists.password = hashedPassword;
            userExists.otp = otp;
            userExists.otpExpires = otpExpires;
            user = await userExists.save();
        } else {
            // CREATE brand new user
            user = await User.create({
                name,
                email,
                password: hashedPassword,
                otp: otp,
                otpExpires: otpExpires,
                isVerified: false
            });
        }

        // 5. Send Email
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

export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // 1. Find the user just by email first
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2. Check if already verified
        if (user.isVerified) {
            return res.status(200).json({ message: "User already verified" });
        }

        // 3. Check if the OTP matches (Compare user.otp vs req.body.otp)
        // We use toString() and trim() to ensure no hidden spaces cause errors
        if (!user.otp || user.otp.toString().trim() !== otp.toString().trim()) {
             // Debugging log
             console.log(`Mismatch: DB says ${user.otp}, User entered ${otp}`);
             return res.status(400).json({ message: "Invalid verification code" });
        }

        // 4. Success
        user.isVerified = true;
        user.otp = undefined; // Clear the code
        await user.save();

        res.status(200).json({ message: "Email verified successfully! You can now login." });

    } catch (error) {
        console.error("Verify Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find the user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2. Check if they verified their OTP
        if (!user.isVerified) {
            return res.status(401).json({ message: "Please verify your email first!" });
        }

        // 3. Compare Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // 4. Generate JWT
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' } 
        );

        // --- UPDATED RESPONSE ---
        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                // Add these lines so the frontend gets the data:
                profilePic: user.profilePic, 
                coverImage: user.coverImage,
                phone: user.phone,
                year: user.year
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// authController.js

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

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update user with new OTP
    user.otp = otp;
    await user.save();

    // Send Email (Reuse your existing sendEmail function)
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

// FORGOT PASSWORD (Sends the Link)
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate Reset Token (Random Hex String)
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash the token and save to DB
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes
    
    await user.save();

    // Create the Reset URL (Frontend Route)
    // Make sure 'localhost:5173' matches your Frontend Port
    const resetUrl = `http://localhost:5173/passwordreset/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Reset Your Password - CampusMart",
        resetUrl: resetUrl, // <--- Key change: passing URL specifically for the template
        name: user.name
      });

      res.status(200).json({ message: "Email sent" });
    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);
      // If email fails, clear the token so user isn't locked out
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. RESET PASSWORD (Verifies Token & Sets New Password)
export const resetPassword = async (req, res) => {
  try {
    // Hash the token from the URL to compare with the one in DB
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() } // Check if time > now (not expired)
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
   
    // Assuming you are manually hashing or have middleware:
    if(req.body.password) {
        // If you are hashing manually in register, do it here too:
        const importBcrypt = await import('bcryptjs'); // Dynamic import if needed or use top-level
        const salt = await importBcrypt.default.genSalt(10);
        user.password = await importBcrypt.default.hash(req.body.password, salt);
    }

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};