const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");
const { assertMessagingAllowed, normalizeMessage } = require("./conversation.service");

async function createMessage({ conversationId, senderId, content }) {
  const cleanContent = String(content || "").trim();
  if (!cleanContent) {
    const err = new Error("El mensaje no puede estar vacío");
    err.code = "INVALID_MESSAGE";
    throw err;
  }

  const { conversation, otherParticipantId } = await assertMessagingAllowed(senderId, conversationId);

  const message = await Message.create({
    conversationId,
    sender: senderId,
    content: cleanContent,
    deliveredBy: [],
    readBy: [],
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessageAt: message.createdAt } }
  );

  return {
    message: normalizeMessage(message),
    participantIds: conversation.participants.map((id) => id.toString()),
    otherParticipantId,
  };
}

module.exports = { createMessage };
