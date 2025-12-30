import Chat from '../models/Chat.js';
import User from '../models/User.js';

// 1. Access or Create a 1-on-1 Chat
export const accessChat = async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.status(400).send("UserId param not sent with request");

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
        // Step 1: Get ALL chats for this user from DB (don't filter here yet)
        let chats = await Chat.find({
            users: { $elemMatch: { $eq: req.user._id } }
        })
        .populate("users", "-password")
        .populate("latestMessage")
        .sort({ updatedAt: -1 });

        // Step 2: Populate the sender info inside the latestMessage
        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "name email pic"
        });

        // Step 3: ✨ THE FILTER FIX ✨
        // We filter the array in JavaScript after population.
        // This removes any chat where 'latestMessage' is null, undefined, or invalid.
        const validChats = chats.filter(chat => chat.latestMessage != null);

        res.status(200).send(validChats);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};