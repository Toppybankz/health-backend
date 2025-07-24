const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // ✅ Change if frontend URL changes
    methods: ["GET", "POST"],
  },
});

// ✅ Middleware
app.use(express.json());
app.use(cors());

// ✅ Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/chat", require("./routes/chat"));

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Mongo Error:", err.message));

// ✅ Socket.IO Real-time Chat
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ✅ Join a private chat room
  socket.on("joinRoom", (room) => {
    if (!room) return;
    socket.join(room);
    console.log(`✅ User ${socket.id} joined room: ${room}`);
  });

  // ✅ Send message (Save to DB + emit to correct room)
  socket.on("sendMessage", async (msg) => {
    console.log("📥 Message received from client:", msg);

    let { sender, senderName, receiver, text, room } = msg;

    // ✅ Validate required fields
    if (!sender || !receiver || !text || !room) {
      console.error("❌ Invalid message data:", msg);
      return;
    }

    // ✅ Ensure senderName always has a value
    if (!senderName || senderName.trim() === "") {
      senderName = "Unknown User"; // Fallback to prevent validation error
    }

    try {
      // ✅ Save message in MongoDB with validated senderName
      const newMessage = new Message({
        sender,
        senderName, // Guaranteed not empty
        receiver,
        text,
      });
      await newMessage.save();
      console.log("✅ Message saved to DB:", newMessage);

      // ✅ Prepare formatted message
      const formattedMessage = {
        _id: newMessage._id,
        text: newMessage.text,
        sender: newMessage.sender,
        receiver: newMessage.receiver,
        senderName: newMessage.senderName,
        room,
        createdAt: newMessage.createdAt,
      };

      // ✅ Emit ONLY to that specific room
      io.to(room).emit("message", formattedMessage);
      console.log(`📤 Message sent to room: ${room}`);
    } catch (err) {
      console.error("❌ Error saving/broadcasting message:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
