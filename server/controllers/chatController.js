import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

// 1. Access or Create a 1-on-1 Chat
export const accessChat = async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.status(400).send("UserId param not sent with request");

    // Block cross-college chat initiation
    const targetUser = await User.findById(userId).select('college');
    if (!targetUser) return res.status(404).json({ message: "User not found." });
    if (req.user.college !== targetUser.college) {
        return res.status(403).json({ message: "You cannot interact with items outside your college." });
    }

    // Check if chat exists
    let isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } }, 
            { users: { $elemMatch: { $eq: userId } } },       
        ],
    })
    .populate("users", "-password")
    .populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "name email pic",
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        // Create new chat container
        const chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                "users",
                "-password"
            );
            res.status(200).send(FullChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
};

// 2. Fetch all chats for the user (Sidebar)
// 🔴 THIS IS THE FIXED VERSION 🔴
export const fetchChats = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 20;
        const skip = (page - 1) * limit;

        let chats = await Chat.find({
            users: { $elemMatch: { $eq: req.user._id } }
        })
        .populate("users", "-password")
        .populate("latestMessage")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name email pic"
        });

        const validChats = chats.filter(chat => chat.latestMessage != null);

        res.status(200).json({ chats: validChats, page, hasMore: chats.length === limit });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};


export const deleteMultipleChats = async (req, res) => {
    const { chatIds } = req.body;

    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
        return res.status(400).json({ message: "No chat IDs provided" });
    }

    try {
        // 1. First, delete all messages associated with these chats
        await Message.deleteMany({ chat: { $in: chatIds } });

        // 2. Then, delete the chat containers themselves
        await Chat.deleteMany({ _id: { $in: chatIds } });
        
        res.status(200).json({ message: "Chats and messages deleted successfully" });
    } catch (error) {
        res.status(500);
        throw new Error(error.message);
    }
};