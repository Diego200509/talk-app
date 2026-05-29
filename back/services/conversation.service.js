const mongoose = require("mongoose");
const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");
const User = require("../models/User.model");
const { toPublicUser } = require("../utils/user.util");
const { isUserBlocked } = require("./block.service");
const { isUserOnline } = require("./presence.service");

function idsToStrings(arr) {
  return (arr || []).map((id) => id.toString());
}

function viewerObjectId(userId) {
  return new mongoose.Types.ObjectId(userId);
}

/** Mensajes visibles para quien consulta (excluye los ocultos por bloqueo). */
function visibleMessagesQuery(conversationId, viewerId) {
  const oid = viewerObjectId(viewerId);
  return {
    conversationId,
    deletedForEveryone: { $ne: true },
    blockedFor: { $ne: oid },
  };
}

function normalizeMessage(message) {
  if (!message) return null;
  const deleted = Boolean(message.deletedForEveryone);
  return {
    id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    senderId: message.sender.toString(),
    type: message.type || "text",
    content: deleted ? "" : message.content || "",
    imageUrl: deleted ? null : message.imageUrl || null,
    documentUrl: deleted ? null : message.documentUrl || null,
    voiceUrl: deleted ? null : message.voiceUrl || null,
    fileName: deleted ? null : message.fileName || null,
    mimeType: deleted ? null : message.mimeType || null,
    fileSize: deleted ? null : message.fileSize ?? null,
    durationSeconds: deleted ? null : message.durationSeconds ?? null,
    createdAt: message.createdAt,
    deletedForEveryone: deleted,
    deletedAt: message.deletedAt || null,
    deliveredBy: idsToStrings(message.deliveredBy),
    readBy: idsToStrings(message.readBy),
    blockedFor: idsToStrings(message.blockedFor),
  };
}

function isHiddenForUser(message, userId) {
  return (message.blockedFor || []).some((id) => id.toString() === userId.toString());
}

async function getUnreadCount(conversationId, userId) {
  const uid = viewerObjectId(userId);
  return Message.countDocuments({
    conversationId,
    sender: { $ne: userId },
    readBy: { $ne: uid },
    deletedForEveryone: { $ne: true },
    blockedFor: { $ne: uid },
  });
}

async function getLastVisibleMessage(conversationId, viewerId) {
  return Message.findOne(visibleMessagesQuery(conversationId, viewerId))
    .sort({ createdAt: -1 })
    .lean();
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
    if (await isUserBlocked(currentUserId, targetUserId)) {
      const err = new Error("Desbloquea a este usuario para iniciar la conversación");
      err.code = "USER_BLOCKED_SENDER";
      throw err;
    }
    conversation = await Conversation.create({
      type: "direct",
      participants: [currentUserId, targetUserId],
      lastMessageAt: new Date(),
    });
  }

  const blockedByMe = await isUserBlocked(currentUserId, targetUserId);

  const lastMessage = await getLastVisibleMessage(conversation._id, currentUserId);

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
    blocked: blockedByMe,
  };
}

async function getMessageHistory(conversationId, currentUserId) {
  const conversation = await assertConversationAccess(conversationId, currentUserId);
  const messages = await Message.find(visibleMessagesQuery(conversationId, currentUserId))
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
  if (await isUserBlocked(senderId, otherId)) {
    const err = new Error("Desbloquea a este usuario para enviarle mensajes.");
    err.code = "USER_BLOCKED_SENDER";
    throw err;
  }
  const receiverBlockedSender = await isUserBlocked(otherId, senderId);
  return {
    conversation,
    otherParticipantId: otherId.toString(),
    receiverBlockedSender,
  };
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

  const updated = await Message.findByIdAndUpdate(
    messageId,
    {
      $set: {
        deletedForEveryone: true,
        deletedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  const conversation = await Conversation.findById(message.conversationId).lean();
  const participantIds = conversation.participants.map((id) => id.toString());

  return {
    message: normalizeMessage(updated || message),
    participantIds,
  };
}

async function markMessageDelivered(messageId, userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const message = await Message.findOne({
    _id: messageId,
    sender: { $ne: userId },
    deletedForEveryone: { $ne: true },
    blockedFor: { $ne: uid },
  });
  if (!message) return null;
  if (isHiddenForUser(message, userId)) return null;

  await assertConversationAccess(message.conversationId, userId);

  const updated = await Message.findOneAndUpdate(
    { _id: messageId, deliveredBy: { $ne: uid } },
    { $addToSet: { deliveredBy: uid } },
    { returnDocument: "after" }
  );
  return normalizeMessage(updated || message);
}

async function markMessageAsRead(messageId, userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const message = await Message.findOne({
    _id: messageId,
    sender: { $ne: userId },
    deletedForEveryone: { $ne: true },
    blockedFor: { $ne: uid },
  });
  if (!message) return null;
  if (isHiddenForUser(message, userId)) return null;

  await assertConversationAccess(message.conversationId, userId);

  const updated = await Message.findOneAndUpdate(
    { _id: messageId },
    { $addToSet: { readBy: uid, deliveredBy: uid } },
    { returnDocument: "after" }
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
      blockedFor: { $ne: uid },
    },
    { $addToSet: { readBy: uid, deliveredBy: uid } }
  );

  const updatedDocs = await Message.find({
    conversationId,
    sender: { $ne: userId },
    deletedForEveryone: { $ne: true },
    readBy: uid,
    blockedFor: { $ne: uid },
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
    blockedFor: { $ne: uid },
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
      { returnDocument: "after" }
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
  isHiddenForUser,
  getLastVisibleMessage,
  visibleMessagesQuery,
};
