const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: "All fields are required." });
    if (!["doctor", "patient"].includes(role)) return res.status(400).json({ message: "Role must be doctor or patient." });
    if (typeof password !== "string" || password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "Email already registered." });
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({ name: String(name).trim(), email: normalizedEmail, password: hashedPassword, role, status: role === "doctor" ? "pending" : "approved" });
    return res.status(201).json({ message: role === "doctor" ? "Registration received. Your account will be reviewed by an administrator." : "Registration successful", user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status } });
  } catch (error) { console.error("Register Error:", error.message); return res.status(500).json({ message: "Server error during registration." }); }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) return res.status(400).json({ message: "Email and password required." });
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid email or password." });
    if (user.role === "doctor" && user.status !== "approved") {
      return res.status(403).json({ message: user.status === "rejected" ? "Your doctor application was not approved. Please contact support." : "Your doctor account is awaiting administrator approval." });
    }
    if (user.status === "suspended" || user.status === "rejected") return res.status(403).json({ message: "This account is unavailable. Please contact support." });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Authentication is not configured." });
    const token = jwt.sign({ id: String(user._id), name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.json({ message: "Login successful", token, user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status } });
  } catch (error) { console.error("Login Error:", error.message); return res.status(500).json({ message: "Server error during login." }); }
});

router.get("/doctors", verifyToken, async (req, res) => {
  try { return res.json(await User.find({ role: "doctor", status: "approved" }).select("name email role status")); }
  catch (error) { console.error("Error fetching doctors:", error.message); return res.status(500).json({ message: "Server error fetching doctors." }); }
});
router.get("/patients", verifyToken, async (req, res) => {
  try {
    if (!["admin", "doctor"].includes(req.user.role)) return res.status(403).json({ message: "You are not allowed to view the patient directory." });
    return res.json(await User.find({ role: "patient", status: "approved" }).select("name email role status"));
  } catch (error) { console.error("Error fetching patients:", error.message); return res.status(500).json({ message: "Server error fetching patients." }); }
});
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json(user);
  } catch (error) { console.error("Error fetching user data:", error.message); return res.status(500).json({ message: "Server error fetching user data." }); }
});
module.exports = router;
