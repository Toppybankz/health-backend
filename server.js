const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("./models/User");

const envPath = process.env.SECRET_ENV_PATH || path.resolve(__dirname, ".env");
dotenv.config({ path: envPath });

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://health-consultation-frontend.vercel.app",
  "http://localhost:3000"
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
};

app.use(express.json({ limit: "1mb" }));
app.use(cors(corsOptions));

const io = new Server(server, { cors: corsOptions });
app.set("io", io);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/admin", require("./routes/admin"));

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token || !process.env.JWT_SECRET) return next(new Error("Authentication required"));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinRoom", async (otherUserId) => {
    const currentUserId = String(socket.user.id);
    const receiverId = String(otherUserId || "");
    if (!receiverId || receiverId === currentUserId) return;
    try {
      const otherUser = await User.findById(receiverId).select("_id role status");
      if (!otherUser || otherUser.status !== "approved" || otherUser.role === socket.user.role) return;
      const room = `private-${[currentUserId, receiverId].sort().join("-")}`;
      socket.join(room);
    } catch (error) {
      console.error("Unable to join chat room:", error.message);
    }
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((error) => console.error("MongoDB connection error:", error.message));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
