import nodemailer from 'nodemailer';

const getTransporter = () => nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
    },
});

const generateReminderTemplate = (userName) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
    <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">KampusCart</h1>
    </div>
    <div style="padding: 30px; color: #333; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Your Campus Marketplace Awaits! 🛒</h2>
        <p>Hi <strong>${userName || 'Student'}</strong>,</p>
        <p>It's been a while! There are new listings on your campus — from textbooks to electronics, your next great deal might already be posted.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://kampuscart.site" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Browse Items Now
            </a>
        </div>
        <p style="font-size: 13px; color: #999;">You're receiving this because you have an account on KampusCart.</p>
    </div>
    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
        <p>&copy; ${new Date().getFullYear()} KampusCart Team</p>
    </div>
</div>
`;

export const sendReminderEmail = async ({ email, name }) => {
    await getTransporter().sendMail({
        from: '"KampusCart" <noreply@kampuscart.site>',
        to: email,
        subject: 'You haven\'t visited KampusCart in a while 👀',
        html: generateReminderTemplate(name),
    });
};
