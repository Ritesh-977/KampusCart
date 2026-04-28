import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { sendReminderEmail } from './brevoEmailService.js';

await sendReminderEmail({ email: 'ritesh.20223500@mnnit.ac.in', name: 'Ritesh' });
console.log('Done');
