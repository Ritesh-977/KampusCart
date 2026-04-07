import crypto from 'crypto';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/sendEmail.js';
import { supportedColleges } from '../config/colleges.js';

// --- 1. HELPER: Send Token in HTTP-Only Cookie ---
const sendToken = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // ⚡ FIXED: Restored production settings. 
  // If you are testing on localhost, you might need to temporarily toggle these, 
  // but for your live Vercel/Render site, they MUST be exactly this:
  const options = {
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days
  httpOnly: true, // Prevents XSS attacks
  sameSite: 'lax', // Protects against CSRF attacks
  secure: true, // MUST be true in production (requires HTTPS)
  domain: ".kampuscart.site", // Allows sharing between api. and www.
  path: "/"
};

  res.cookie('token', token, options);

  res.status(statusCode).json({
    success: true,
    token: token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      college: user.college, // <--- Now returning the user's college
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

    // 1. Multi-College Domain Extraction
    const emailDomain = email.split('@')[1];

    // 2. Check if the college is supported
    if (!supportedColleges[emailDomain]) {
      return res.status(403).json({
        message: "Please use an official college domain email to access the marketplace.",
      });
}

    const collegeName = supportedColleges[emailDomain];

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
      userExists.college = collegeName; // Update college just in case
      userExists.otp = otp;
      userExists.otpExpires = otpExpires;
      user = await userExists.save();
    } else {
      user = await User.create({
        name,
        email,
        password: hashedPassword,
        college: collegeName, // <--- Save college to database
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
      return sendToken(user, 200, res);
    }

    if (!user.otp || user.otp.toString().trim() !== otp.toString().trim()) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    sendToken(user, 200, res);

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

    // Backfill college for users who registered before this feature was added
    if (!user._doc.college) {
      const emailDomain = user.email.split('@')[1];
      user.college = supportedColleges[emailDomain] || "MNNIT Allahabad";
      await user.save();
    }

    // 🧹 AGGRESSIVE CLEANUP: Destroy any zombie cookies before setting the new one
    res.clearCookie('token', { domain: 'api.kampuscart.site', path: '/' });
    res.clearCookie('token', { domain: '.kampuscart.site', path: '/' });
    res.clearCookie('token', { path: '/' }); // Catch-all

    // Send Token via Cookie Helper
    sendToken(user, 200, res);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutUser = (req, res) => {
  // ⚡ FIXED: These options must perfectly match 'sendToken' for deletion to work
  const baseCookieOptions = {
    httpOnly: true,
    sameSite: 'None',
    secure: true,
    path: "/"
  };

  // 1. Clear the NEW wildcard cookie (.kampuscart.site)
  res.clearCookie('token', { ...baseCookieOptions, domain: ".kampuscart.site" });

  // 2. Clear the OLD specific cookie (api.kampuscart.site)
  res.clearCookie('token', { ...baseCookieOptions, domain: "api.kampuscart.site" });

  // 3. Clear default (no domain specified)
  res.clearCookie('token', baseCookieOptions);

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

// --- GOOGLE LOGIN (existing users only) ---
export const googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ message: 'Missing access_token.' });
    }

    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ message: 'Invalid or expired Google token.' });
    }

    const profile = await googleRes.json();
    const { email, email_verified } = profile;

    if (!email_verified) {
      return res.status(401).json({ message: 'Google account email is not verified.' });
    }

    const emailDomain = email.split('@')[1];
    if (!supportedColleges[emailDomain]) {
      return res.status(403).json({
        message: "Please use an official college domain email to access the marketplace.",
      });
}

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        message: 'No account found for this Google email. Please sign up first.',
      });
    }

    if (user.isBanned) {
      const currentDate = new Date();
      if (!user.banExpiresAt || currentDate <= new Date(user.banExpiresAt)) {
        const banMessage = user.banExpiresAt
          ? `Your account is suspended.`
          : 'Your account has been permanently banned.';
        return res.status(403).json({ message: banMessage });
      }
      user.isBanned = false;
      user.banExpiresAt = null;
      await user.save();
    }

    sendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- GOOGLE SIGNUP / LOGIN ---
export const googleSignup = async (req, res) => {
  try {
    const { access_token, emailDomain } = req.body;

    if (!access_token || !emailDomain) {
      return res.status(400).json({ message: 'Missing access_token or emailDomain.' });
    }

    // 1. Fetch the user profile from Google using the access token
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ message: 'Invalid or expired Google token.' });
    }

    const profile = await googleRes.json();
    const { email, name, picture, email_verified } = profile;

    if (!email_verified) {
      return res.status(401).json({ message: 'Google account email is not verified.' });
    }

    // 2. Security check: the user's actual email domain must match the selected campus
    const userEmailDomain = email.split('@')[1];
    if (userEmailDomain !== emailDomain) {
      return res.status(403).json({
        message: 'Access denied. Please use your official email ID for the selected campus.',
      });
    }

    // 3. Validate that the domain is supported by KampusCart
   if (!supportedColleges[emailDomain]) {
      return res.status(403).json({
        message: "Please use an official college domain email to access the marketplace.",
      });
}

    const collegeName = supportedColleges[emailDomain];

    // 4. Find or create the user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Ban check
      if (user.isBanned) {
        const currentDate = new Date();
        if (!user.banExpiresAt || currentDate <= new Date(user.banExpiresAt)) {
          const banMessage = user.banExpiresAt
            ? `Your account is suspended.`
            : 'Your account has been permanently banned.';
          return res.status(403).json({ message: banMessage });
        }
        user.isBanned = false;
        user.banExpiresAt = null;
      }
      // Ensure account is marked verified and college is set
      if (!user.isVerified) user.isVerified = true;
      if (!user.college) user.college = collegeName;
      if (!user.profilePic && picture) user.profilePic = picture;
      await user.save();
    } else {
      // New user — generate a random placeholder password (they use Google to log in)
      const placeholderPassword = await bcrypt.hash(
        crypto.randomBytes(32).toString('hex'),
        10
      );
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        password: placeholderPassword,
        college: collegeName,
        profilePic: picture || '',
        isVerified: true,
      });
    }

    sendToken(user, 200, res);
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

    if (req.body.password) {
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