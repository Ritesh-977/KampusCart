import Message from '../models/Message.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';

async function sendPushNotifications(tokens, title, body, data) {
  if (!tokens.length) return;
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    android: { channelId: 'messages', priority: 'high' },
  }));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('[Push] Failed to send notifications:', e.message);
  }
}

export const sendMessage = async (req, res) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) return res.sendStatus(400);

    const newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
    };

    try {
        let message = await Message.create(newMessage);

        // Populate sender and chat info
        message = await message.populate("sender", "name pic");
        message = await message.populate("chat");
        message = await User.populate(message, {
            path: "chat.users",
            select: "name pic email",
        });

        // Update latest message in Chat
        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        // Send push notifications to all other users in the chat
        const recipientIds = message.chat.users
          .map((u) => u._id || u)
          .filter((id) => String(id) !== String(req.user._id));

        if (recipientIds.length) {
          const recipients = await User.find(
            { _id: { $in: recipientIds } },
            'pushSubscription'
          );
          const tokens = recipients
            .flatMap((u) => u.pushSubscription || [])
            .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));

          const senderName = message.sender?.name || 'Someone';
          const preview = message.content?.length > 100
            ? message.content.slice(0, 100) + '…'
            : message.content;

          await sendPushNotifications(tokens, senderName, preview, {
            chatId: String(message.chat._id),
            senderId: String(req.user._id),
            senderName,
            senderPic: message.sender?.pic || '',
          });
        }

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

export const allMessages = async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate("sender", "name pic email")
            .populate("chat");
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};


// @route   PUT /api/message/read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) return res.status(400).json({ message: "Chat ID is required" });

    // Update all messages in this chat where 'readBy' does NOT contain current user
    await Message.updateMany(
      { chat: chatId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    
    // Also update the Chat's latestMessage if needed (optional but good for syncing)
    await Chat.findByIdAndUpdate(chatId, {
        // You might need to update specific flags here if your schema has them
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};