const mongoose = require("mongoose");
const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");
const User = require("../models/User.model");
const { toPublicUser } = require("../utils/user.util");
const { isUserBlocked, isBlockedEitherWay } = require("./block.service");
const { isUserOnline } = require("./presence.service");

function idsToStrings(arr) {
  return (arr || []).map((id) => id.toString());
}

function normalizeMessage(message) {
  if (!message) return null;
  return {
    id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    senderId: message.sender.toString(),
    content: message.deletedForEveryone ? "" : message.content,
    createdAt: message.createdAt,
    deletedForEveryone: Boolean(message.deletedForEveryone),
    deletedAt: message.deletedAt || null,
    deliveredBy: idsToStrings(message.deliveredBy),
    readBy: idsToStrings(message.readBy),
  };
}

async function getUnreadCount(conversationId, userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  return Message.countDocuments({
    conversationId,
    sender: { $ne: userId },
    readBy: { $ne: uid },
    deletedForEveryone: { $ne: true },
  });
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
    if (await isBlockedEitherWay(currentUserId, targetUserId)) {
      const err = new Error("No puedes iniciar conversación con este usuario");
      err.code = "USER_BLOCKED";
      throw err;
    }
    conversation = await Conversation.create({
      type: "direct",
      participants: [currentUserId, targetUserId],
      lastMessageAt: new Date(),
    });
  }

  const blockedByMe = await isUserBlocked(currentUserId, targetUserId);
  const blockedMe = await isUserBlocked(targetUserId, currentUserId);

  const lastMessage = await Message.findOne({
    conversationId: conversation._id,
    deletedForEveryone: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .lean();

  const mutedBy = idsToStrings(conversation.mutedBy);
  const unreadCount = await getUnreadCount(conversation._id, currentUserId);

  return {
    id: conversation._id.toString(),
    type: conversation.type,
    participants: [toPublicUser(targetUser)],
    lastMessage: lastMessage ? normalizeMessage(lastMessage) : null,
    participantIds: conversation.participants.map((id) => id.toString()),
    muted: mutedBy.includes(currentUserId.toString()),
    unreadCount,
    blockedByMe,
    blockedMe,
    blocked: blockedByMe || blockedMe,
  };
}

async function getMessageHistory(conversationId, currentUserId) {
  const conversation = await assertConversationAccess(conversationId, currentUserId);
  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(500)
    .lean();

  return {
    conversationId: conversation._id.toString(),
    messages: messages.map(normalizeMessage),
    participantIds: conversation.participants.map((id) => id.toString()),
  };
}

async function listConversationMessages(conversationId, currentUserId) {
  const { messages } = await getMessageHistory(conversationId, currentUserId);
  return messages;
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

async function assertMessagingAllowed(senderId, conversationId) {
  const conversation = await assertConversationAccess(conversationId, senderId);
  const otherId = conversation.participants.find((id) => id.toString() !== senderId.toString());
  if (!otherId) {
    const err = new Error("Conversación inválida");
    err.code = "INVALID_CONVERSATION";
    throw err;
  }
  if (await isBlockedEitherWay(senderId, otherId)) {
    const err = new Error("No puedes enviar mensajes en esta conversación");
    err.code = "USER_BLOCKED";
    throw err;
  }
  return { conversation, otherParticipantId: otherId.toString() };
}

async function deleteMessageForEveryone(messageId, userId) {
  const message = await Message.findById(messageId);
  if (!message) {
    const err = new Error("Mensaje no encontrado");
    err.code = "MESSAGE_NOT_FOUND";
    throw err;
  }
  if (message.sender.toString() !== userId.toString()) {
    const err = new Error("Solo el autor puede eliminar el mensaje para todos");
    err.code = "FORBIDDEN_DELETE";
    throw err;
  }
  if (message.deletedForEveryone) {
    return {
      message: normalizeMessage(message),
      participantIds: [],
    };
  }

  await assertConversationAccess(message.conversationId, userId);

  message.deletedForEveryone = true;
  message.deletedAt = new Date();
  message.content = "";
  await message.save();

  const conversation = await Conversation.findById(message.conversationId).lean();
  const participantIds = conversation.participants.map((id) => id.toString());

  return {
    message: normalizeMessage(message),
    participantIds,
  };
}

async function markMessageDelivered(messageId, userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const message = await Message.findOne({
    _id: messageId,
    sender: { $ne: userId },
    deletedForEveryone: { $ne: true },
  });
  if (!message) return null;

  await assertConversationAccess(message.conversationId, userId);

  const updated = await Message.findOneAndUpdate(
    { _id: messageId, deliveredBy: { $ne: uid } },
    { $addToSet: { deliveredBy: uid } },
    { new: true }
  );
  return normalizeMessage(updated || message);
}

async function markMessageAsRead(messageId, userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const message = await Message.findOne({
    _id: messageId,
    sender: { $ne: userId },
    deletedForEveryone: { $ne: true },
  });
  if (!message) return null;

  await assertConversationAccess(message.conversationId, userId);

  const updated = await Message.findOneAndUpdate(
    { _id: messageId },
    { $addToSet: { readBy: uid, deliveredBy: uid } },
    { new: true }
  );
  return normalizeMessage(updated || message);
}

async function markConversationAsRead(conversationId, userId) {
  const conversation = await assertConversationAccess(conversationId, userId);
  const uid = new mongoose.Types.ObjectId(userId);

  await Message.updateMany(
    {
      conversationId,
      sender: { $ne: userId },
      deletedForEveryone: { $ne: true },
      readBy: { $ne: uid },
    },
    { $addToSet: { readBy: uid, deliveredBy: uid } }
  );

  const updatedDocs = await Message.find({
    conversationId,
    sender: { $ne: userId },
    deletedForEveryone: { $ne: true },
    readBy: uid,
  }).lean();

  const messages = updatedDocs.map(normalizeMessage);

  return {
    conversationId: conversation._id.toString(),
    messages,
    participantIds: conversation.participants.map((id) => id.toString()),
    unreadCount: 0,
  };
}

async function markAllConversationsDeliveredForUser(userId) {
  const conversations = await Conversation.find({ participants: userId }).select("_id").lean();
  const conversationIds = conversations.map((c) => c._id);
  const uid = new mongoose.Types.ObjectId(userId);

  const pending = await Message.find({
    conversationId: { $in: conversationIds },
    sender: { $ne: userId },
    deletedForEveryone: { $ne: true },
    deliveredBy: { $ne: uid },
  }).lean();

  const updated = [];
  for (const msg of pending) {
    const conversation = await Conversation.findById(msg.conversationId).lean();
    const senderId = msg.sender.toString();
    if (conversation) {
      const otherId = conversation.participants.find((id) => id.toString() !== userId.toString());
      if (otherId && (await isUserBlocked(otherId, userId))) continue;
      if (await isUserBlocked(userId, senderId)) continue;
    }

    const doc = await Message.findOneAndUpdate(
      { _id: msg._id, deliveredBy: { $ne: uid } },
      { $addToSet: { deliveredBy: uid } },
      { new: true }
    );
    if (doc) updated.push(normalizeMessage(doc));
  }

  return updated;
}

async function muteConversation(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const err = new Error("Conversación no encontrada");
    err.code = "CONVERSATION_NOT_FOUND";
    throw err;
  }
  await assertConversationAccess(conversationId, userId);
  const uid = new mongoose.Types.ObjectId(userId);
  if (!conversation.mutedBy.some((id) => id.toString() === userId.toString())) {
    conversation.mutedBy.push(uid);
    await conversation.save();
  }
  return {
    conversationId: conversation._id.toString(),
    muted: true,
    participantIds: conversation.participants.map((id) => id.toString()),
  };
}

async function unmuteConversation(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const err = new Error("Conversación no encontrada");
    err.code = "CONVERSATION_NOT_FOUND";
    throw err;
  }
  await assertConversationAccess(conversationId, userId);
  conversation.mutedBy = conversation.mutedBy.filter((id) => id.toString() !== userId.toString());
  await conversation.save();
  return {
    conversationId: conversation._id.toString(),
    muted: false,
    participantIds: conversation.participants.map((id) => id.toString()),
  };
}

function isConversationMutedForUser(conversation, userId) {
  return (conversation.mutedBy || []).some((id) => id.toString() === userId.toString());
}

module.exports = {
  getOrCreateDirectConversation,
  listConversationMessages,
  getMessageHistory,
  assertConversationAccess,
  assertMessagingAllowed,
  normalizeMessage,
  deleteMessageForEveryone,
  markMessageDelivered,
  markMessageAsRead,
  markConversationAsRead,
  markAllConversationsDeliveredForUser,
  getUnreadCount,
  muteConversation,
  unmuteConversation,
  isConversationMutedForUser,
  isUserOnline,
};
