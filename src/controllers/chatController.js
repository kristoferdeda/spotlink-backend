const ChatMessage = require("../models/ChatMessage");
const mongoose = require("mongoose");
const User = require("../models/User");

// Save a new message
const saveMessage = async (senderId, receiverId, message) => {
  const newMessage = new ChatMessage({ sender: senderId, receiver: receiverId, message });
  await newMessage.save();
};

// Get all messages between current user and another user
const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await ChatMessage.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
      deletedBy: { $ne: currentUserId },
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    console.error("❌ Failed to get chat history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Soft delete chat for the current user
const clearConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    await ChatMessage.updateMany(
      {
        $or: [
          { sender: currentUserId, receiver: userId },
          { sender: userId, receiver: currentUserId },
        ],
        deletedBy: { $ne: currentUserId },
      },
      { $push: { deletedBy: currentUserId } }
    );

    res.json({ message: "✅ Conversation cleared for current user" });
  } catch (error) {
    console.error("❌ Failed to clear conversation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// List of users user has chatted with (raw)
const getConversationsList = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const chats = await ChatMessage.find({
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId },
      ],
      deletedBy: { $ne: currentUserId },
    });

    const userIdsSet = new Set();

    chats.forEach(chat => {
      const otherUserId =
        chat.sender.toString() === currentUserId
          ? chat.receiver.toString()
          : chat.sender.toString();
      userIdsSet.add(otherUserId);
    });

    const uniqueUserIds = Array.from(userIdsSet);
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select("_id name");

    res.json({ users });
  } catch (error) {
    console.error("❌ Failed to fetch conversations list:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Return last message summary per conversation
const getConversationSummaries = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user.id);

    const messages = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserId },
            { receiver: currentUserId },
          ],
          deletedBy: { $ne: currentUserId },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          sender: 1,
          receiver: 1,
          message: 1,
          createdAt: 1,
          otherUser: {
            $cond: [
              { $eq: ["$sender", currentUserId] },
              "$receiver",
              "$sender",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$otherUser",
          lastMessage: { $first: "$message" },
          lastMessageTime: { $first: "$createdAt" },
        },
      },
    ]);

    const userIds = messages.map((m) => m._id);
    const users = await User.find({ _id: { $in: userIds } }).select("_id name");

    const result = users.map((u) => {
      const m = messages.find((m) => String(m._id) === String(u._id));
      return {
        _id: u._id,
        name: u.name,
        lastMessage: m?.lastMessage || "",
        lastMessageTime: m?.lastMessageTime || null,
      };
    });

    res.json({ users: result });
  } catch (err) {
    console.error("❌ Failed to get conversation summaries:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user by ID (for re-fetching after deleted conversation)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("_id name");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("❌ Failed to fetch user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  saveMessage,
  getChatHistory,
  clearConversation,
  getConversationsList,
  getConversationSummaries,
  getUserById,
};
