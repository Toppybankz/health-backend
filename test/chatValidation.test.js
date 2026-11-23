const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidObjectId, validatePrivateMessageInput } = require("../utils/chatValidation");

const senderId = "507f1f77bcf86cd799439011";
const receiverId = "507f191e810c19729de860ea";

test("accepts valid 24-character hexadecimal account IDs", () => {
  assert.equal(isValidObjectId(receiverId), true);
  assert.equal(isValidObjectId("507F191E810C19729DE860EA"), true);
});

test("rejects malformed account IDs", () => {
  for (const value of ["", "123", "not-an-id", "507f191e810c19729de860eaz", null, 42]) {
    assert.equal(isValidObjectId(value), false);
  }
});

test("accepts a valid private message from a patient or doctor", () => {
  for (const role of ["patient", "doctor"]) {
    assert.equal(validatePrivateMessageInput({
      senderId, receiverId, text: "Hello", role
    }), null);
  }
});

test("requires both a recipient and non-empty message text", () => {
  assert.deepEqual(validatePrivateMessageInput({
    senderId, receiverId: "", text: "Hello", role: "patient"
  }), { status: 400, message: "Receiver and message text are required." });
  assert.deepEqual(validatePrivateMessageInput({
    senderId, receiverId, text: "   ", role: "patient"
  }), { status: 400, message: "Receiver and message text are required." });
});

test("rejects invalid recipient IDs and self-messaging", () => {
  assert.equal(validatePrivateMessageInput({
    senderId, receiverId: "bad-id", text: "Hello", role: "patient"
  }).message, "Invalid receiver account.");
  assert.equal(validatePrivateMessageInput({
    senderId, receiverId: senderId, text: "Hello", role: "patient"
  }).message, "You cannot send a private message to yourself.");
});

test("enforces the message length limit and permitted roles", () => {
  assert.equal(validatePrivateMessageInput({
    senderId, receiverId, text: "x".repeat(5001), role: "patient"
  }).status, 400);
  assert.equal(validatePrivateMessageInput({
    senderId, receiverId, text: "Hello", role: "admin"
  }).status, 403);
});
