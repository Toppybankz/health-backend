const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true }, // Sender userId
    senderName: { type: String, required: true }, // ✅ For displaying name
    receiver: { type: String, default: null }, // ✅ Null = group chat
    text: { type: String, required: true }, // Message content
  },
  { timestamps: true } // ✅ Automatically adds createdAt & updatedAt
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
