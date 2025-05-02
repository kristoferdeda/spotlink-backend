const express = require("express");
const { getUserById, getConversationSummaries, clearConversation, getChatHistory, getConversationsList } = require("../controllers/chatController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Get chat history with a user
router.get("/:userId", protect, getChatHistory);
router.get("/conversations/list", protect, getConversationsList);
router.post("/clear/:userId", protect, clearConversation);
router.get("/conversations/summary", protect, getConversationSummaries);
router.get("/user/:id", protect, getUserById);

module.exports = router;
