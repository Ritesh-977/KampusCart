import nodemailer from 'nodemailer';

// TEMPLATE 1: OTP Verification (Blue Theme)
const generateVerificationTemplate = (otp, userName) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #4A90E2; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">CampusMart</h1>
        </div>
        <div style="padding: 30px; color: #333; line-height: 1.6;">
            <h2 style="color: #4A90E2;">Verify Your Account</h2>
            <p>Hi <strong>${userName || 'Student'}</strong>,</p>
            <p>Thank you for joining CampusMart! To ensure a safe community, please use the code below to complete your registration:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4A90E2; background: #f0f7ff; padding: 10px 20px; border-radius: 5px; border: 1px dashed #4A90E2;">
                    ${otp}
                </span>
            </div>
            
            <p style="font-size: 14px; color: #666;">This code is valid for <strong>20 minutes</strong>. If you did not request this, please ignore this email.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            <p>&copy; 2025 CampusMart Team</p>
        </div>
    </div>
    `;
};

// TEMPLATE 2: Password Reset (Red/Orange Theme for Urgency)
const generateResetTemplate = (resetUrl, userName) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #FF5722; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">CampusMart</h1>
        </div>
        <div style="padding: 30px; color: #333; line-height: 1.6;">
            <h2 style="color: #FF5722;">Reset Your Password</h2>
            <p>Hi <strong>${userName || 'Student'}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to choose a new one:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #FF5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                    Reset Password
                </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">This link is valid for <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">Button not working? Copy this link:<br><a href="${resetUrl}" style="color: #FF5722;">${resetUrl}</a></p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            <p>&copy; 2025 CampusMart Team</p>
        </div>
    </div>
    `;
};

export const sendEmail = async (options) => {
   const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,              // CHANGE THIS: 587 is more reliable on cloud servers
        secure: false,          // CHANGE THIS: Must be false for port 587
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // 2. Add this TLS config to prevent handshake errors on some networks
        tls: {
            ciphers: "SSLv3",
            rejectUnauthorized: false,
        },
    });

    let htmlContent;

    // LOGIC: Automatically switch template based on input
    if (options.resetUrl) {
        // If a reset URL is provided, use the Reset Password template
        htmlContent = generateResetTemplate(options.resetUrl, options.name);
    } else {
        // Otherwise, default to the OTP Verification template
        htmlContent = generateVerificationTemplate(options.otp, options.name);
    }

    const mailOptions = {
        from: '"CampusMart Security" <noreply@campusmart.com>',
        to: options.email,
        subject: options.subject,
        html: htmlContent,
    };

    try {
        console.log("Attempting to send email to:", options.email);
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully! Message ID:", info.messageId);
        return info;
    } catch (error) {
        console.error("FATAL EMAIL ERROR:", error);
        throw new Error("Email could not be sent: " + error.message);
    }
    
};