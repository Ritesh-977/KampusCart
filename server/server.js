import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'; // 1. IMPORT THIS
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import User from './models/User.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import userRoutes from './routes/userRoutes.js';
import lostFoundRoutes from './routes/lostFoundRoutes.js';
import chatRoutes from './routes/chatRoutes.js';       
import messageRoutes from './routes/messageRoutes.js'; 
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import studyMaterialRoutes from './routes/studyMaterialRoutes.js';
import sportRoutes from './routes/sportRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import { idempotencyCheck } from './middleware/idempotencyMiddleware.js';
import { startCronJobs } from './utils/cronJobs.js';

// Connect to Database
connectDB();

const app = express();

// Initialize scheduled tasks
startCronJobs();

app.set('trust proxy', 1);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://www.kampuscart.site",   
  "https://buy-sell-murex.vercel.app",
  "https://kampuscart.onrender.com",
  "http://localhost:8081",
  "https://kampus-cart.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true // Crucial for cookies to work
}));

app.use(express.json());
app.use(cookieParser()); // 2. USE THIS (Must be before routes)
app.use('/uploads', express.static('uploads')); 

// Apply Circuit Breaker Idempotency guard globally
app.use('/api', idempotencyCheck);

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/chat', chatRoutes); 
app.use('/api/message', messageRoutes); 
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/materials', studyMaterialRoutes);
app.use('/api/sports', sportRoutes);
app.use('/api/feedback', feedbackRoutes);

// ── College slugs (mirrors client/src/data/colleges.js) ──────────────────────
const COLLEGE_SLUGS = [
  "iit-bombay","iit-delhi","iit-guwahati","iit-kanpur","iit-kharagpur",
  "iit-madras","iit-roorkee","iit-hyderabad","iit-bhubaneswar","iit-gandhinagar",
  "iit-jodhpur","iit-patna","iit-indore","iit-mandi","iit-bhu","iit-palakkad",
  "iit-tirupati","iit-ism","iit-bhilai","iit-dharwad","iit-jammu","iit-goa","iit-ropar",
  "mnnit-allahabad","nit-agartala","nit-andhra","nit-arunachal","nit-calicut",
  "nit-delhi","nit-durgapur","nit-goa","nit-hamirpur","nit-jalandhar","nit-jamshedpur",
  "nit-surathkal","nit-kurukshetra","nit-manipur","nit-meghalaya","nit-mizoram",
  "nit-nagaland","nit-patna","nit-puducherry","nit-raipur","nit-rourkela","nit-silchar",
  "nit-srinagar","nit-trichy","nit-uttarakhand","nit-warangal","mnit-jaipur",
  "manit-bhopal","svnit-surat","vnit-nagpur","nit-sikkim",
  "bits-pilani","bits-goa","bits-hyderabad","vit-vellore","srm","manipal","thapar"
];

const BASE_URL = 'https://www.kampuscart.site';

// Sitemap helpers
const xmlUrl = (loc, priority = '0.5', changefreq = 'weekly') =>
  `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

app.get('/sitemap.xml', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const staticUrls = [
    xmlUrl(`${BASE_URL}/`, '1.0', 'daily'),
    xmlUrl(`${BASE_URL}/select-college`, '0.9', 'monthly'),
    xmlUrl(`${BASE_URL}/about`, '0.6', 'monthly'),
    xmlUrl(`${BASE_URL}/contact`, '0.5', 'monthly'),
    xmlUrl(`${BASE_URL}/privacy`, '0.3', 'yearly'),
    xmlUrl(`${BASE_URL}/terms`, '0.3', 'yearly'),
  ];

  // One campus landing page per college — targets "[College Name] marketplace" queries
  const campusUrls = COLLEGE_SLUGS.map(slug =>
    xmlUrl(`${BASE_URL}/?campus=${slug}`, '0.8', 'daily')
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticUrls,
    ...campusUrls,
    '</urlset>',
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
  res.status(200).send(xml);
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

// --- SOCKET.IO SETUP ---
const httpServer = createServer(app);

const io = new Server(httpServer, {
    pingTimeout: 60000,
    cors: {
        origin: allowedOrigins,
        credentials: true,
    }
});

// Expose io to all controllers via req.app.get('io')
app.set('io', io);

const onlineUsers = new Map();

io.on('connection', (socket) => {

    // A. User Setup — join personal room + college broadcast room
    socket.on('setup', async (userData) => {
        const userId = userData._id || userData.id || userData;
        if (!userId) return console.log("⚠️ Setup failed: No User ID provided");

        socket.join(String(userId));
        onlineUsers.set(String(userId), socket.id);

        // Join college room so controllers can broadcast to `college:<name>`
        try {
            const user = await User.findById(userId).select('college');
            if (user?.college) {
                socket.join(`college:${user.college}`);
            }
        } catch { /* non-critical — socket still works without college room */ }

        socket.emit('connected');
        io.emit('online_users', Array.from(onlineUsers.keys()));
    });

    // B. Join Chat
    socket.on('join chat', (room) => {
        socket.join(room);
        console.log('👥 Joined Room: ' + room);
    });

    // C. New Message
    socket.on('new message', (newMessageReceived) => {
        var chat = newMessageReceived.chat;

        if (!chat.users) return console.log('Chat.users not defined');

        chat.users.forEach((user) => {
            const userId = user._id || user.id;
            const senderId = newMessageReceived.sender._id || newMessageReceived.sender.id;

            if (String(userId) === String(senderId)) return;

            socket.in(String(userId)).emit('message received', newMessageReceived);
        });
    });

    // D. Typing
    socket.on('typing', (room) => socket.in(room).emit('typing'));
    socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

    // E. Disconnect
    socket.on('disconnect', () => {
        for (let [key, value] of onlineUsers.entries()) {
            if (value === socket.id) {
                onlineUsers.delete(key);
                break;
            }
        }
        io.emit('online_users', Array.from(onlineUsers.keys()));
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));