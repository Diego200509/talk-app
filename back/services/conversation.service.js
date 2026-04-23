const mongoose = require("mongoose");
const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");
const User = require("../models/User.model");
const { toPublicUser } = require("./user.service");

function normalizeMessage(message) {
  return {
    id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    senderId: message.sender.toString(),
    content: message.content,
    createdAt: message.createdAt,
  };
}

async function getOrCreateDirectConversation(currentUserId, targetUserId) {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error("Usuario destino inválido");
    err.code = "INVALID_TARGET";
    throw err;
  }
  if (currentUserId.toString() === targetUserId.toString()) {
    const err = new Error("No puedes iniciar un chat contigo mismo");
    err.code = "INVALID_TARGET";
    throw err;
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    const err = new Error("Usuario no encontrado");
    err.code = "TARGET_NOT_FOUND";
    throw err;
  }

  let conversation = await Conversation.findOne({
    type: "direct",
    participants: { $all: [currentUserId, targetUserId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      type: "direct",
      participants: [currentUserId, targetUserId],
      lastMessageAt: new Date(),
    });
  }

  const lastMessage = await Message.findOne({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .lean();

  return {
    id: conversation._id.toString(),
    type: conversation.type,
    participants: [toPublicUser(targetUser)],
    lastMessage: lastMessage ? normalizeMessage(lastMessage) : null,
    participantIds: conversation.participants.map((id) => id.toString()),
  };
}

async function listConversationMessages(conversationId, currentUserId) {
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) {
    const err = new Error("Conversación no encontrada");
    err.code = "CONVERSATION_NOT_FOUND";
    throw err;
  }
  const isParticipant = conversation.participants.some(
    (participantId) => participantId.toString() === currentUserId.toString()
  );
  if (!isParticipant) {
    const err = new Error("No autorizado para esta conversación");
    err.code = "FORBIDDEN_CONVERSATION";
    throw err;
  }

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(500)
    .lean();

  return messages.map(normalizeMessage);
}

async function assertConversationAccess(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) {
    const err = new Error("Conversación no encontrada");
    err.code = "CONVERSATION_NOT_FOUND";
    throw err;
  }
  const hasAccess = conversation.participants.some((id) => id.toString() === userId.toString());
  if (!hasAccess) {
    const err = new Error("No autorizado");
    err.code = "FORBIDDEN_CONVERSATION";
    throw err;
  }
  return conversation;
}

module.exports = {
  getOrCreateDirectConversation,
  listConversationMessages,
  assertConversationAccess,
  normalizeMessage,
};
