import { Resend } from 'resend';

// Initialize Resend with your API Key

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

// TEMPLATE 3: Monthly Digest (Green Theme for Marketplace Activity)
const generateMonthlyDigestTemplate = (userName, recentItems) => {
    // 1. Added .slice(0, 3) to ensure a maximum of 3 items are rendered
    const itemsHtml = recentItems.slice(0, 3).map(item => `
        <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <strong style="color: #333; font-size: 16px;">${item.title}</strong>
            <span style="color: #4CAF50; float: right; font-weight: bold;">₹${item.price}</span>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">${item.category}</p>
        </div>
    `).join('');

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">KampusCart Highlights</h1>
        </div>
        <div style="padding: 30px; color: #333; line-height: 1.6;">
            <h2 style="color: #4CAF50;">This Month on Campus</h2>
            <p>Hi <strong>${userName || 'Student'}</strong>,</p>
            
            <p style="font-size: 16px; font-weight: bold; color: #2E7D32;">Why spend more when someone on your campus is selling it for less?</p>
            
            <p>Check out some of the top items your fellow students listed on KampusCart recently. Don't miss out on these deals!</p>
            
            <div style="margin: 30px 0; background: #f9f9f9; padding: 15px; border-radius: 8px;">
                ${itemsHtml || '<p>It was a quiet month! Be the first to list something new.</p>'}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://kampuscart.site" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                    Browse All Items
                </a>
            </div>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            <p>&copy; ${new Date().getFullYear()} KampusCart Team</p>
            <p><a href="#" style="color: #999; text-decoration: underline;">Unsubscribe from monthly digests</a></p>
        </div>
    </div>
    `;
};

export const sendEmail = async (options) => {
    let htmlContent;
    const resend = new Resend(process.env.RESEND_API_KEY);

    // LOGIC: Automatically switch template based on input flags
    if (options.resetUrl) {
        htmlContent = generateResetTemplate(options.resetUrl, options.name);
    } else if (options.isMonthlyDigest) {
        // Trigger the new digest template
        htmlContent = generateMonthlyDigestTemplate(options.name, options.recentItems);
    } else {
        htmlContent = generateVerificationTemplate(options.otp, options.name);
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'KampusCart <noreply@kampuscart.site>', 
            to: [options.email], 
            subject: options.subject,
            html: htmlContent,
        });

        if (error) {
            console.error('Resend API Error:', error);
            throw new Error('Failed to send email via Resend');
        }

        console.log('Email sent successfully:', data);
        return data;

    } catch (err) {
        console.error('Email sending failed:', err);
        throw err;
    }
};