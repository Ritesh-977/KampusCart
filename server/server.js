import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
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

// Connect to Database
connectDB();

const app = express();

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads')); 

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/chat', chatRoutes); 
app.use('/api/message', messageRoutes); 
app.use('/api/upload', uploadRoutes);

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
    console.log('🔗 New Socket Connection:', socket.id);

    // A. User Setup
    socket.on('setup', (userData) => {
        // Handle cases where frontend sends object {_id: "..."} or just "..."
        const userId = userData._id || userData.id || userData;
        
        if (!userId) return console.log("⚠️ Setup failed: No User ID provided");
        
        socket.join(userId);
        onlineUsers.set(userId, socket.id);
        
        console.log(`✅ User Setup Complete: ${userId}`);
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
            
            // console.log(`📡 Sending message to: ${userId}`);
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