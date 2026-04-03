import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'; // 1. IMPORT THIS
import { createServer } from 'http'; 
import { Server } from 'socket.io';  
import connectDB from './config/db.js';

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
  "http://localhost:8081"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true // Crucial for cookies to work
}));

app.use(express.json());
app.use(cookieParser()); // 2. USE THIS (Must be before routes)
app.use('/uploads', express.static('uploads')); 

app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

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

// ── App Link / Universal Link verification files ──────────────────────────────
// Android verifies   GET https://kampuscart.site/.well-known/assetlinks.json
// iOS     verifies   GET https://kampuscart.site/.well-known/apple-app-site-association
//
// Both MUST be served over HTTPS with the exact Content-Type shown below.
// Both MUST be reachable without any redirect (no www→bare or bare→www redirect
// on this specific path).
// Fill in the placeholder values in the JSON files before your first Play Store
// or App Store submission.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/.well-known/assetlinks.json', (_req, res) => {
  try {
    const file = readFileSync(
      join(__dirname, '.well-known', 'assetlinks.json'),
      'utf8'
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(file);
  } catch {
    res.status(404).json({ error: 'assetlinks.json not configured' });
  }
});

app.get('/.well-known/apple-app-site-association', (_req, res) => {
  try {
    const file = readFileSync(
      join(__dirname, '.well-known', 'apple-app-site-association'),
      'utf8'
    );
    // Must be application/json — NOT application/pkcs7-mime
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(file);
  } catch {
    res.status(404).json({ error: 'apple-app-site-association not configured' });
  }
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

const onlineUsers = new Map(); 

io.on('connection', (socket) => {
   
    // A. User Setup
    socket.on('setup', (userData) => {
        const userId = userData._id || userData.id || userData;
        if (!userId) return console.log("⚠️ Setup failed: No User ID provided");
        
        socket.join(userId);
        onlineUsers.set(userId, socket.id);
    
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
            
            socket.in(userId).emit('message received', newMessageReceived);
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