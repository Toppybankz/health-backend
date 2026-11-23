const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const { isValidObjectId, validatePrivateMessageInput } = require("../utils/chatValidation");
const privateRoom = (first, second) => `private-${[String(first), String(second)].sort().join("-")}`;
router.use(verifyToken);

router.post("/send", async (req, res) => {
  try {
    const sender = String(req.user.id), receiver = String(req.body.receiver || "");
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const validationError = validatePrivateMessageInput({ senderId: sender, receiverId: receiver, text, role: req.user.role });
    if (validationError) return res.status(validationError.status).json({ error: validationError.message });
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
    if (!sender || !receiver || ![String(sender), String(receiver)].includes(current)) return res.status(403).json({ message: "You cannot access this conversation." });
    if (!isValidObjectId(String(sender)) || !isValidObjectId(String(receiver))) return res.status(400).json({ message: "Invalid conversation participant." });
    return res.json(await Message.find({ $or: [{ sender: String(sender), receiver: String(receiver) }, { sender: String(receiver), receiver: String(sender) }] }).sort({ createdAt: 1, _id: 1 }));
  } catch (error) { console.error("Error fetching private messages:", error.message); return res.status(500).json({ error: "Failed to fetch private messages." }); }
});

router.get("/conversations", async (req, res) => {
  try {
    const current = String(req.user.id);
    const messages = await Message.find({ $or: [{ sender: current }, { receiver: current }] }).sort({ createdAt: -1, _id: -1 }).lean();
    const latestByParticipant = new Map();
    for (const message of messages) {
      const participantId = String(message.sender) === current ? String(message.receiver || "") : String(message.sender);
      if (participantId && !latestByParticipant.has(participantId)) latestByParticipant.set(participantId, message);
    }
    const participantIds = [...latestByParticipant.keys()];
    const participants = await User.find({ _id: { $in: participantIds }, status: "approved", role: { $in: ["doctor", "patient"] } }).select("name role status").lean();
    const participantById = new Map(participants.map((user) => [String(user._id), user]));
    const conversations = participantIds.flatMap((participantId) => {
      const participant = participantById.get(participantId);
      const lastMessage = latestByParticipant.get(participantId);
      return participant && lastMessage ? [{ participant: { id: participantId, name: participant.name, role: participant.role }, lastMessage }] : [];
    });
    return res.json(conversations);
  } catch (error) { console.error("Error fetching conversations:", error.message); return res.status(500).json({ error: "Failed to fetch conversations." }); }
});

router.get("/messages", async (req, res) => {
  try {
    const current = String(req.user.id);
    return res.json(await Message.find({ $or: [{ sender: current }, { receiver: current }] }).sort({ createdAt: 1, _id: 1 }));
  } catch (error) { console.error("Error fetching messages:", error.message); return res.status(500).json({ error: "Failed to fetch messages." }); }
});
module.exports = router;
