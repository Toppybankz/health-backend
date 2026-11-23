const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

function isValidObjectId(value) {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

function validatePrivateMessageInput({ senderId, receiverId, text, role }) {
  if (!receiverId || typeof text !== "string" || !text.trim()) {
    return { status: 400, message: "Receiver and message text are required." };
  }
  if (!isValidObjectId(receiverId)) {
    return { status: 400, message: "Invalid receiver account." };
  }
  if (receiverId === senderId) {
    return { status: 400, message: "You cannot send a private message to yourself." };
  }
  if (text.length > 5000) {
    return { status: 400, message: "Message must be 5,000 characters or fewer." };
  }
  if (!["doctor", "patient"].includes(role)) {
    return { status: 403, message: "Only doctors and patients can use private chat." };
  }
  return null;
}

module.exports = { isValidObjectId, validatePrivateMessageInput };
