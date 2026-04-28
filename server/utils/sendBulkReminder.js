import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import User from '../models/User.js';
import { sendReminderEmail } from './brevoEmailService.js';

await connectDB();

const users = await User.find({ isVerified: true, isBanned: false }, 'name email');
console.log(`📋 Found ${users.length} users. Sending emails...\n`);

let success = 0, failed = 0;

for (const user of users) {
    try {
        await sendReminderEmail({ email: user.email, name: user.name });
        await User.findByIdAndUpdate(user._id, { lastReminderSentAt: new Date() });
        console.log(`✅ Sent to ${user.email}`);
        success++;
    } catch (err) {
        console.log(`❌ Failed for ${user.email}: ${err.message}`);
        failed++;
    }
}

console.log(`\n📊 Summary: ${success} sent, ${failed} failed out of ${users.length} total.`);
process.exit(0);
