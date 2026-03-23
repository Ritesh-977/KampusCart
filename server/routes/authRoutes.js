import express from 'express';
import { forgotPassword, googleLogin, googleSignup, loginUser, logoutUser, registerUser, resendOtp, resetPassword, verifyEmail } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyEmail);
router.post('/login', loginUser);
router.post('/resend-otp', resendOtp);
router.get('/logout', logoutUser);
router.post('/google-signup', googleSignup);
router.post('/google-login', googleLogin);

router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

export default router;