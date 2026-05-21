const { SOCKET_EVENTS } = require("../constants/socket-events");
const {
  addConnection,
  removeConnection,
  getVisibleOnlineUsers,
} = require("../services/presence.service");
const { getRelatedUserIdsForRealtime } = require("../services/user.service");
const { shouldEmitToUser } = require("../services/block.service");
const {
  assertConversationAccess,
  getMessageHistory,
  markConversationAsRead,
  markAllConversationsDeliveredForUser,
  markMessageDelivered,
  markMessageAsRead,
  isUserOnline,
} = require("../services/conversation.service");
const { createMessage } = require("../services/message.service");
const {
  emitStatusUpdates,
  emitConversationUpdated,
  emitUnreadUpdated,
  isUserViewingConversation,
} = require("./realtime.helpers");

async function broadcastOnlineToRelated(io, userId) {
  const related = await getRelatedUserIdsForRealtime(userId);
  const viewers = new Set([userId, ...related]);

  for (const viewerId of viewers) {
    const viewerRelated =
      viewerId === userId ? related : await getRelatedUserIdsForRealtime(viewerId);
    const scope = new Set([...viewerRelated, userId]);
    const onlineIds = getVisibleOnlineUsers(viewerId, [...scope]);
    io.to(`user:${viewerId}`).emit(SOCKET_EVENTS.USERS_ONLINE, { userIds: onlineIds });
  }
}

async function processReadReceipts(io, readResult, readerUserId) {
  if (!readResult.messages.length) {
    await emitUnreadUpdated(io, {
      conversationId: readResult.conversationId,
      userId: readerUserId,
      fromUserId: readerUserId,
    });
    return;
  }
  await emitStatusUpdates(io, {
    messages: readResult.messages,
    event: SOCKET_EVENTS.MESSAGE_READ,
  });
  await emitUnreadUpdated(io, {
    conversationId: readResult.conversationId,
    userId: readerUserId,
    fromUserId: readerUserId,
  });
}

function registerChatHandlers(io) {
  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    socket.data.activeConversationId = null;

    addConnection(userId, socket.id);
    await broadcastOnlineToRelated(io, userId);

    const delivered = await markAllConversationsDeliveredForUser(userId);
    if (delivered.length) {
      await emitStatusUpdates(io, {
        messages: delivered,
        event: SOCKET_EVENTS.MESSAGE_DELIVERED,
      });
    }

    socket.on(SOCKET_EVENTS.CONVERSATION_JOIN, async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await assertConversationAccess(conversationId, userId);
        socket.data.activeConversationId = conversationId;
        socket.join(`conversation:${conversationId}`);

        const { messages } = await getMessageHistory(conversationId, userId);
        socket.emit(SOCKET_EVENTS.CONVERSATION_HISTORY, {
          conversationId,
          messages,
        });

        const readResult = await markConversationAsRead(conversationId, userId);
        await processReadReceipts(io, readResult, userId);
      } catch {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: "No autorizado para unirse a esta conversación",
        });
      }
    });

    socket.on(SOCKET_EVENTS.CONVERSATION_READ, async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        const readResult = await markConversationAsRead(conversationId, userId);
        await processReadReceipts(io, readResult, userId);
      } catch {
        /* ignorar */
      }
    });

    socket.on(SOCKET_EVENTS.USER_TYPING, async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await assertConversationAccess(conversationId, userId);
        socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.USER_TYPING, {
          conversationId,
          userId,
        });
      } catch {
        /* ignorar */
      }
    });

    socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING, async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await assertConversationAccess(conversationId, userId);
        socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.USER_STOPPED_TYPING, {
          conversationId,
          userId,
        });
      } catch {
        /* ignorar */
      }
    });

    socket.on(SOCKET_EVENTS.MESSAGE_SEND, async ({ conversationId, content }) => {
      try {
        const { message, participantIds, otherParticipantId } = await createMessage({
          conversationId,
          senderId: userId,
          content,
        });

        let statusMessage = message;
        const recipientViewing = await isUserViewingConversation(
          io,
          conversationId,
          otherParticipantId
        );

        if (recipientViewing) {
          const readMsg = await markMessageAsRead(message.id, otherParticipantId);
          if (readMsg) {
            statusMessage = readMsg;
            await emitStatusUpdates(io, {
              messages: [readMsg],
              event: SOCKET_EVENTS.MESSAGE_READ,
            });
          }
        } else if (isUserOnline(otherParticipantId)) {
          const deliveredMsg = await markMessageDelivered(message.id, otherParticipantId);
          if (deliveredMsg) {
            statusMessage = deliveredMsg;
            await emitStatusUpdates(io, {
              messages: [deliveredMsg],
              event: SOCKET_EVENTS.MESSAGE_DELIVERED,
            });
          }
        }

        for (const participantId of participantIds) {
          const canEmit = await shouldEmitToUser(userId, participantId);
          if (!canEmit) continue;
          io.to(`user:${participantId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, statusMessage);
        }

        await emitConversationUpdated(io, {
          conversationId,
          message: statusMessage,
          participantIds,
          fromUserId: userId,
        });

        if (!recipientViewing) {
          await emitUnreadUpdated(io, {
            conversationId,
            userId: otherParticipantId,
            fromUserId: userId,
          });
        }
      } catch (error) {
        if (error.code === "USER_BLOCKED") {
          socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: error.message || "No puedes enviar mensajes",
          });
          return;
        }
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: error.message || "No se pudo enviar el mensaje",
        });
      }
    });

    socket.on("disconnect", async () => {
      const { wentOffline } = removeConnection(userId, socket.id);
      if (wentOffline) {
        await broadcastOnlineToRelated(io, userId);
      }
    });
  });
}

module.exports = { registerChatHandlers, broadcastOnlineToRelated };
