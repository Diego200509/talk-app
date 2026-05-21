const { SOCKET_EVENTS } = require("../constants/socket-events");
const { shouldEmitToUser } = require("../services/block.service");
const { getUnreadCount, normalizeMessage } = require("../services/conversation.service");

async function emitToMessageSender(io, message, event) {
  const senderId = message.senderId;
  const canEmit = await shouldEmitToUser(message.senderId, senderId);
  if (!canEmit) return;
  io.to(`user:${senderId}`).emit(event, { message });
}

async function emitStatusUpdates(io, { messages, event }) {
  const seen = new Set();
  for (const message of messages) {
    if (!message?.id || seen.has(message.id)) continue;
    seen.add(message.id);
    await emitToMessageSender(io, message, event);
  }
}

async function emitConversationUpdated(io, {
  conversationId,
  message,
  participantIds,
  fromUserId,
}) {
  for (const participantId of participantIds) {
    const canEmit = await shouldEmitToUser(fromUserId, participantId);
    if (!canEmit) continue;
    const unreadCount = await getUnreadCount(conversationId, participantId);
    io.to(`user:${participantId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
      conversationId,
      message,
      unreadCount,
    });
  }
}

async function emitUnreadUpdated(io, { conversationId, userId, fromUserId }) {
  const canEmit = await shouldEmitToUser(fromUserId, userId);
  if (!canEmit) return;
  const unreadCount = await getUnreadCount(conversationId, userId);
  io.to(`user:${userId}`).emit(SOCKET_EVENTS.CONVERSATION_UNREAD_UPDATED, {
    conversationId,
    unreadCount,
  });
}

async function isUserViewingConversation(io, conversationId, userId) {
  const sockets = await io.in(`conversation:${conversationId}`).fetchSockets();
  return sockets.some(
    (s) =>
      s.data.userId === userId && s.data.activeConversationId === conversationId
  );
}

module.exports = {
  emitToMessageSender,
  emitStatusUpdates,
  emitConversationUpdated,
  emitUnreadUpdated,
  isUserViewingConversation,
  SOCKET_EVENTS,
};
