import cron from 'node-cron';
import User from '../models/User.js'; 
import Item from '../models/Item.js'; 
import { sendEmail } from './sendEmail.js';
import { sendReminderEmail } from './brevoEmailService.js';

export const startCronJobs = () => {
    // Schedule: Runs at 10:00 AM on the 1st of every month
    // Cron expression: '0 10 1 * *'
    cron.schedule('0 10 1 * *', async () => {
        console.log('Running Monthly Digest Cron Job...');

        try {
            // 1. Get the date 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // 2. Fetch recent top items 
            const recentItems = await Item.find({
                createdAt: { $gte: thirtyDaysAgo },
                isSold: false, // Only show available items
                isReported: false // Don't promote items that have been reported
            })
            .sort({ createdAt: -1 }) // Get the newest
            .limit(3)
            .select('title price category'); // Only fetch what the email needs

            if (recentItems.length === 0) {
                console.log('No new items this month. Skipping digest.');
                return; 
            }

            // 3. Fetch all verified users who are not banned
            const users = await User.find({ 
                isVerified: true,
                isBanned: false,
                // isSubscribed: true // Uncomment this when your DB has the subscription flag
            });

            // 4. Loop through users and send emails
            for (const user of users) {
                await sendEmail({
                    email: user.email,
                    name: user.name,
                    // userId: user._id, // Uncomment this to enable the unsubscribe link in the email template
                    subject: 'KampusCart: Top Finds This Month! 🛒',
                    isMonthlyDigest: true,
                    recentItems: recentItems
                });
            }

            console.log('Monthly digest sent successfully to all users.');

        } catch (error) {
            console.error('Error running monthly digest cron job:', error);
        }
    }, {
        // 👇 INDIA TIMEZONE CONFIGURATION ADDED HERE
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // Staggered Monthly Reminder — runs every night at 1:00 AM IST
    // Sends to up to 250 users who haven't been reminded in the last 30 days
    cron.schedule('0 1 * * *', async () => {
        console.log('Running staggered monthly reminder cron job...');

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        try {
            const users = await User.find({
                isVerified: true,
                isBanned: false,
                $or: [
                    { lastReminderSentAt: null },
                    { lastReminderSentAt: { $lt: thirtyDaysAgo } },
                ],
            })
            .select('email name lastReminderSentAt')
            .limit(250);

            console.log(`Sending reminders to ${users.length} users...`);

            for (const user of users) {
                try {
                    await sendReminderEmail({ email: user.email, name: user.name });
                    await User.findByIdAndUpdate(user._id, { lastReminderSentAt: new Date() });
                } catch (err) {
                    console.error(`Failed to send reminder to ${user.email}:`, err.message);
                }
            }

            console.log('Staggered reminder job complete.');
        } catch (error) {
            console.error('Error running staggered reminder cron job:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};