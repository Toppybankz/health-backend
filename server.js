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
app.disable("x-powered-by");

const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [
  ...configuredOrigins,
  "https://health-consultation-frontend.vercel.app",
  "http://localhost:3000",
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
};

app.use(express.json({ limit: "1mb" }));
app.use(cors(corsOptions));

const io = new Server(server, { cors: corsOptions });
app.set("io", io);

// Public operational endpoints for deployment checks and service discovery.
app.get("/", (_req, res) => {
  res.json({
    service: "Health Consultation API",
    status: "running",
    health: "/health",
    api: ["/api/auth", "/api/chat", "/api/admin"],
  });
});

app.get("/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  const status = databaseConnected ? "ok" : "degraded";
  return res.status(databaseConnected ? 200 : 503).json({
    status,
    service: "health-consultation-api",
    database: databaseConnected ? "connected" : "disconnected",
  });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/admin", require("./routes/admin"));

io.use(async (socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token || !process.env.JWT_SECRET) return next(new Error("Authentication required"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("_id name role status");
    if (!user || user.status !== "approved" || !["doctor", "patient"].includes(user.role)) {
      return next(new Error("Account is not approved for chat"));
    }
    socket.user = { id: String(user._id), name: user.name, role: user.role };
    return next();
  } catch (error) {
    return next(new Error("Invalid token or unavailable account"));
  }
});

io.on("connection", (socket) => {
  socket.on("leaveRoom", (otherUserId) => {
    const current = String(socket.user.id);
    const receiver = String(otherUserId || "");
    if (!receiver || receiver === current) return;
    socket.leave(`private-${[current, receiver].sort().join("-")}`);
  });

  socket.on("joinRoom", async (otherUserId) => {
    const current = String(socket.user.id);
    const receiver = String(otherUserId || "");
    if (!receiver || receiver === current) return;
    try {
      const other = await User.findById(receiver).select("_id role status");
      if (!other || other.status !== "approved" || other.role === socket.user.role ||
          !["doctor", "patient"].includes(other.role)) return;
      socket.join(`private-${[current, receiver].sort().join("-")}`);
    } catch (error) {
      console.error("Unable to join chat room:", error.message);
    }
  });
});

const PORT = process.env.PORT || 5001;

async function startServer() {
  if (!process.env.MONGO_URI) {
    console.error("MongoDB connection error: MONGO_URI is not configured.");
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error("Authentication configuration error: JWT_SECRET is not configured.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
    server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

startServer();
