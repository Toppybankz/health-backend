const express = require("express");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const { isValidObjectId } = require("../utils/chatValidation");

const router = express.Router();

router.use(verifyToken);
router.use((req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Administrator access required." });
  }
  next();
});

router.get("/overview", async (req, res) => {
  try {
    const [doctorsPending, doctorsApproved, patients, suspended] = await Promise.all([
      User.countDocuments({ role: "doctor", status: "pending" }),
      User.countDocuments({ role: "doctor", status: "approved" }),
      User.countDocuments({ role: "patient", status: "approved" }),
      User.countDocuments({ status: "suspended" })
    ]);
    return res.json({ doctorsPending, doctorsApproved, patients, suspended });
  } catch (error) {
    console.error("Admin overview error:", error.message);
    return res.status(500).json({ message: "Unable to load dashboard overview." });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ["doctor", "patient"] } })
      .select("name email role status createdAt")
      .sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    console.error("Admin users error:", error.message);
    return res.status(500).json({ message: "Unable to load users." });
  }
});

router.patch("/doctors/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid doctor account ID." });
    if (!["approved", "rejected", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved, rejected or suspended." });
    }
    const doctor = await User.findOneAndUpdate(
      { _id: req.params.id, role: "doctor" },
      { status },
      { new: true, runValidators: true }
    ).select("name email role status");
    if (!doctor) return res.status(404).json({ message: "Doctor account not found." });
    return res.json({ message: `Doctor account ${status}.`, user: doctor });
  } catch (error) {
    console.error("Doctor status update error:", error.message);
    return res.status(500).json({ message: "Unable to update doctor status." });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid patient account ID." });
    if (!["approved", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or suspended." });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: "patient" },
      { status },
      { new: true, runValidators: true }
    ).select("name email role status");
    if (!user) return res.status(404).json({ message: "Patient account not found." });
    return res.json({ message: `Patient account ${status}.`, user });
  } catch (error) {
    console.error("User status update error:", error.message);
    return res.status(500).json({ message: "Unable to update account status." });
  }
});

module.exports = router;
