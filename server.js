const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message");

// ✅ Load environment variables
const envPath = process.env.SECRET_ENV_PATH || path.resolve(__dirname, ".env");
dotenv.config({ path: envPath });

const app = express();
const server = http.createServer(app);

// ✅ Allowed origins
const allowedOrigins = [
  "https://health-consultation-frontend.vercel.app", // ✅ Your live frontend
  "http://localhost:3000" // ✅ Local dev
];

// ✅ Middleware
app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);

// ✅ Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✅ Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/chat", require("./routes/chat"));

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Mongo Error:", err.message));

// ✅ Socket.IO Real-time Chat
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // ✅ Join a chat room
  socket.on("joinRoom", (room) => {
    if (!room) return;
    socket.join(room);
    console.log(`✅ User ${socket.id} joined room: ${room}`);
  });

  // ✅ Send and broadcast message
  socket.on("sendMessage", async (msg) => {
    console.log("📥 Message received from client:", msg);

    const { sender, senderName, receiver, text, room } = msg;

    if (!sender || !receiver || !text || !room) {
      console.error("❌ Invalid message data:", msg);
      return;
    }

    try {
      // Save message to DB
      const newMessage = new Message({
        sender,
        senderName,
        receiver,
        text
      });
      await newMessage.save();
      console.log("✅ Message saved to DB:", newMessage);

      // Prepare message for broadcast
      const formattedMessage = {
        _id: newMessage._id,
        text: newMessage.text,
        sender: newMessage.sender,
        receiver: newMessage.receiver,
        senderName: newMessage.senderName,
        room,
        createdAt: newMessage.createdAt
      };

      // ✅ Broadcast message to all users in the room
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

// ✅ Deployment Port
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
