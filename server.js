require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./src/config/db");

// Import Controllers
const { saveMessage } = require("./src/controllers/chatController");

// Import Routes
const authRoutes = require("./src/routes/authRoutes");
const parkingRoutes = require("./src/routes/parkingRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const userRoutes = require("./src/routes/userRoutes");
const chatRoutes = require("./src/routes/chatRoutes");

const app = express();
const server = http.createServer(app); // Create HTTP server

const io = new Server(server, {
  cors: {
    origin: "https://spotlink-frontend.onrender.com",
    credentials: true,
  },
});

// Track connected users for logging (optional)
const connectedUsers = new Map();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: "https://spotlink-frontend.onrender.com",
  credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ SpotLink Backend is running.");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

// Socket.IO setup
io.on("connection", (socket) => {
  console.log("✅ New socket connected:", socket.id);

  // Join user's personal room using their userId
  socket.on("join_room", (userId) => {
    if (userId) {
      socket.join(userId);
      connectedUsers.set(socket.id, userId);
      console.log(`🟢 User ${userId} joined room`);
    }
  });

  // Handle message sending
  socket.on("send_message", async (data) => {
    const { senderId, receiverId, message } = data;
    console.log(`📨 Message from ${senderId} to ${receiverId}:`, message);

    try {
      // Save message to DB
      await saveMessage(senderId, receiverId, message);

      // Emit to receiver (ensures delivery to their room)
      io.to(receiverId).emit("receive_message", {
        senderId,
        receiverId,
        message,
      });

      // Emit to sender (optional UI sync)
      io.to(senderId).emit("receive_message", {
        senderId,
        receiverId,
        message,
      });

      console.log(`✅ Message emitted to rooms: ${senderId}, ${receiverId}`);
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      console.log(`❌ User ${userId} disconnected (socket ${socket.id})`);
      connectedUsers.delete(socket.id);
    } else {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    }
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
