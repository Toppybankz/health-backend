const express = require("express");
const Message = require("../models/Message");
const router = express.Router();

// ✅ Get all messages (Group Chat)
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find({ receiver: null }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ✅ Save message (Group or Private)
router.post("/", async (req, res) => {
  try {
    const { user, text, receiver } = req.body;

    const newMessage = new Message({
      sender: user,
      text,
      receiver: receiver || null // If receiver exists, it's private
    });

    await newMessage.save();
    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ✅ Get private messages between two users
router.get("/private/:sender/:receiver", async (req, res) => {
  try {
    const { sender, receiver } = req.params;

    const privateMessages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender }
      ]
    }).sort({ createdAt: 1 });

    res.json(privateMessages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch private messages" });
  }
});

module.exports = router;
