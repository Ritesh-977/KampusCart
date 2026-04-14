import dotenv from 'dotenv';
dotenv.config();

import { sendReminderEmail } from './brevoEmailService.js';

await sendReminderEmail({ email: 'ritesh.20223500@mnnit.ac.in', name: 'Ritesh' });
console.log('Done');
