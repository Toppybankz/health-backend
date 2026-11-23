const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const verifyToken = require("../middleware/verifyToken");

const privateRoom = (first, second) =>
  `private-${[String(first), String(second)].sort().join("-")}`;

router.use(verifyToken);

// A sender can only send as the authenticated account. The server persists
// once, then broadcasts the saved message to the participants' private room.
router.post("/send", async (req, res) => {
  try {
    const sender = String(req.user.id);
    const receiver = String(req.body.receiver || "");
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!receiver || !text) {
      return res.status(400).json({ error: "Receiver and message text are required." });
    }
    if (receiver === sender) {
      return res.status(400).json({ error: "You cannot send a private message to yourself." });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: "Message must be 5,000 characters or fewer." });
    }

    const newMessage = await Message.create({
      sender,
      senderName: req.user.name || "User",
      receiver,
      text
    });

    const room = privateRoom(sender, receiver);
    const formattedMessage = {
      _id: newMessage._id,
      sender: newMessage.sender,
      senderName: newMessage.senderName,
      receiver: newMessage.receiver,
      text: newMessage.text,
      room,
      createdAt: newMessage.createdAt
    };

    req.app.get("io").to(room).emit("message", formattedMessage);
    return res.status(201).json(formattedMessage);
  } catch (error) {
    console.error("Error sending message:", error.message);
    return res.status(500).json({ error: "Failed to send message." });
  }
});

// Only a participant in the conversation may read its history.
router.get("/private/:sender/:receiver", async (req, res) => {
  try {
    const currentUser = String(req.user.id);
    const { sender, receiver } = req.params;
    if (![String(sender), String(receiver)].includes(currentUser)) {
      return res.status(403).json({ message: "You cannot access this conversation." });
    }

    const messages = await Message.find({
      $or: [
        { sender: String(sender), receiver: String(receiver) },
        { sender: String(receiver), receiver: String(sender) }
      ]
    }).sort({ createdAt: 1 });

    return res.json(messages);
  } catch (error) {
    console.error("Error fetching private messages:", error.message);
    return res.status(500).json({ error: "Failed to fetch private messages." });
  }
});

router.get("/conversations/:userId", async (req, res) => {
  try {
    const currentUser = String(req.user.id);
    if (String(req.params.userId) !== currentUser) {
      return res.status(403).json({ message: "You cannot access another user's conversations." });
    }

    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: currentUser }, { receiver: currentUser }] } },
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ["$sender", "$receiver"] },
              { sender: "$sender", receiver: "$receiver" },
              { sender: "$receiver", receiver: "$sender" }
            ]
          },
          lastMessage: { $last: "$$ROOT" }
        }
      },
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);
    return res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error.message);
    return res.status(500).json({ error: "Failed to fetch conversations." });
  }
});

// Compatibility endpoint used by the frontend service; return only the
// authenticated user's messages rather than exposing the entire message store.
router.get("/messages", async (req, res) => {
  try {
    const userId = String(req.user.id);
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    return res.status(500).json({ error: "Failed to fetch messages." });
  }
});

module.exports = router;
