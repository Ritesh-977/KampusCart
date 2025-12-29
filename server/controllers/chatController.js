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
        // Create new chat
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
export const fetchChats = async (req, res) => {
    try {
        let chats = await Chat.find({
            users: { $elemMatch: { $eq: req.user._id } }
        })
        .populate("users", "-password")
        .populate({
            path: "latestMessage",
            populate: {
                path: "sender",
                select: "name email pic"
            }
        })
        .sort({ updatedAt: -1 });

        res.status(200).send(chats);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};
