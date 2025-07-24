const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// ✅ Send a new private message
router.post("/send", async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;

    if (!sender || !receiver || !text) {
      return res.status(400).json({ error: "Sender, receiver, and text are required" });
    }

    const newMessage = new Message({ sender, receiver, text });
    await newMessage.save();

    res.json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err.message);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ✅ Fetch private messages between two users (UPDATED to ensure sorted history)
router.get("/private/:sender/:receiver", async (req, res) => {
  try {
    const { sender, receiver } = req.params;

    const messages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender }
      ]
    }).sort({ createdAt: 1 }); // ✅ Sorted oldest → newest

    res.json(messages);
  } catch (err) {
    console.error("Error fetching private messages:", err.message);
    res.status(500).json({ error: "Failed to fetch private messages" });
  }
});

// ✅ Fetch all conversations for a user (Keep as is)
router.get("/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      {
        $group: {
          _id: {
            participants: {
              $cond: [
                { $lt: ["$sender", "$receiver"] },
                { sender: "$sender", receiver: "$receiver" },
                { sender: "$receiver", receiver: "$sender" }
              ]
            }
          },
          lastMessage: { $last: "$$ROOT" }
        }
      },
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);

    res.json(conversations);
  } catch (err) {
    console.error("Error fetching conversations:", err.message);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

module.exports = router;
