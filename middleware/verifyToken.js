const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ message: "Authentication required." });
  if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Authentication is not configured." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("_id role status name");
    if (!user || user.status === "suspended" || user.status === "rejected") return res.status(401).json({ message: "This account is unavailable. Please contact support." });
    if (user.role === "doctor" && user.status !== "approved") return res.status(403).json({ message: "Your doctor account is awaiting administrator approval." });
    req.user = { id: String(user._id), name: user.name, role: user.role };
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") return res.status(401).json({ message: "Invalid or expired token." });
    console.error("Authentication error:", error.message);
    return res.status(500).json({ message: "Unable to verify account." });
  }
};
module.exports = verifyToken;
