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

  const { conversation, otherParticipantId, receiverBlockedSender } =
    await assertMessagingAllowed(senderId, conversationId);

  const blockedFor = receiverBlockedSender ? [otherParticipantId] : [];

  const message = await Message.create({
    conversationId,
    sender: senderId,
    content: cleanContent,
    deliveredBy: [],
    readBy: [],
    blockedFor,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessageAt: message.createdAt } }
  );

  return {
    message: normalizeMessage(message),
    participantIds: conversation.participants.map((id) => id.toString()),
    otherParticipantId,
    hiddenFromReceiver: receiverBlockedSender,
  };
}

module.exports = { createMessage };
