const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const privateRoom = (first, second) => `private-${[String(first), String(second)].sort().join("-")}`;
router.use(verifyToken);

router.post("/send", async (req, res) => {
  try {
    const sender = String(req.user.id), receiver = String(req.body.receiver || "");
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!receiver || !text) return res.status(400).json({ error: "Receiver and message text are required." });
    if (receiver === sender) return res.status(400).json({ error: "You cannot send a private message to yourself." });
    if (text.length > 5000) return res.status(400).json({ error: "Message must be 5,000 characters or fewer." });
    if (!["doctor", "patient"].includes(req.user.role)) return res.status(403).json({ error: "Only doctors and patients can use private chat." });
    const recipient = await User.findById(receiver).select("_id role status");
    if (!recipient || recipient.status !== "approved" || recipient.role === req.user.role || !["doctor", "patient"].includes(recipient.role)) return res.status(403).json({ error: "The selected chat participant is unavailable." });
    const saved = await Message.create({ sender, senderName: req.user.name || "User", receiver, text });
    const room = privateRoom(sender, receiver);
    const payload = { _id: saved._id, sender: saved.sender, senderName: saved.senderName, receiver: saved.receiver, text: saved.text, room, createdAt: saved.createdAt };
    req.app.get("io").to(room).emit("message", payload);
    return res.status(201).json(payload);
  } catch (error) { console.error("Error sending message:", error.message); return res.status(500).json({ error: "Failed to send message." }); }
});
router.get("/private/:sender/:receiver", async (req, res) => {
  try {
    const current = String(req.user.id), { sender, receiver } = req.params;
    if (![String(sender), String(receiver)].includes(current)) return res.status(403).json({ message: "You cannot access this conversation." });
    return res.json(await Message.find({ $or: [{ sender: String(sender), receiver: String(receiver) }, { sender: String(receiver), receiver: String(sender) }] }).sort({ createdAt: 1 }));
  } catch (error) { console.error("Error fetching private messages:", error.message); return res.status(500).json({ error: "Failed to fetch private messages." }); }
});
router.get("/conversations/:userId", async (req, res) => {
  try {
    const current = String(req.user.id);
    if (String(req.params.userId) !== current) return res.status(403).json({ message: "You cannot access another user's conversations." });
    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: current }, { receiver: current }] } },
      { $group: { _id: { $cond: [{ $lt: ["$sender", "$receiver"] }, { sender: "$sender", receiver: "$receiver" }, { sender: "$receiver", receiver: "$sender" }] }, lastMessage: { $last: "$$ROOT" } } },
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);
    return res.json(conversations);
  } catch (error) { console.error("Error fetching conversations:", error.message); return res.status(500).json({ error: "Failed to fetch conversations." }); }
});
router.get("/messages", async (req, res) => {
  try {
    const current = String(req.user.id);
    return res.json(await Message.find({ $or: [{ sender: current }, { receiver: current }] }).sort({ createdAt: 1 }));
  } catch (error) { console.error("Error fetching messages:", error.message); return res.status(500).json({ error: "Failed to fetch messages." }); }
});
module.exports = router;
