const { SOCKET_EVENTS } = require("../constants/socket-events");
const { assertConversationAccess } = require("../services/conversation.service");
const { isUserOnline } = require("../services/presence.service");

/** userId -> { withUserId, conversationId } */
const activeCalls = new Map();

function registerCallHandlers(io) {
  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    socket.on(SOCKET_EVENTS.CALL_OFFER, async (payload) => {
      try {
        const { conversationId, offer, targetUserId } = payload || {};
        if (!conversationId || !offer || !targetUserId) return;

        const conversation = await assertConversationAccess(conversationId, userId);
        if (conversation.type === "group") {
          socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: "Las videollamadas grupales estarán disponibles próximamente.",
          });
          return;
        }

        const isParticipant = conversation.participants.some(
          (id) => id.toString() === targetUserId.toString()
        );
        if (!isParticipant) {
          socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: "No se pudo iniciar la llamada con ese contacto.",
          });
          return;
        }

        if (!isUserOnline(targetUserId)) {
          socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: "El usuario no está disponible.",
          });
          return;
        }

        if (activeCalls.has(userId) || activeCalls.has(targetUserId)) {
          socket.emit(SOCKET_EVENTS.CALL_BUSY, { conversationId });
          return;
        }

        activeCalls.set(userId, { withUserId: targetUserId, conversationId });
        activeCalls.set(targetUserId, { withUserId: userId, conversationId });

        io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.CALL_INCOMING, {
          conversationId,
          fromUserId: userId,
          offer,
        });
      } catch {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, { message: "No se pudo iniciar la llamada" });
      }
    });

    socket.on(SOCKET_EVENTS.CALL_ANSWER, (payload) => {
      const { conversationId, answer, targetUserId } = payload || {};
      if (!conversationId || !answer || !targetUserId) return;
      io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.CALL_ACCEPTED, {
        conversationId,
        fromUserId: userId,
        answer,
      });
    });

    socket.on(SOCKET_EVENTS.CALL_ICE_CANDIDATE, (payload) => {
      const { candidate, targetUserId } = payload || {};
      if (!candidate || !targetUserId) return;
      io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, {
        fromUserId: userId,
        candidate,
      });
    });

    function endCallForUser(uid, reason) {
      const peer = activeCalls.get(uid);
      if (peer) {
        activeCalls.delete(uid);
        activeCalls.delete(peer.withUserId);
        io.to(`user:${peer.withUserId}`).emit(SOCKET_EVENTS.CALL_ENDED, {
          conversationId: peer.conversationId,
          fromUserId: uid,
          reason,
        });
      }
    }

    socket.on(SOCKET_EVENTS.CALL_REJECTED, (payload) => {
      const { targetUserId, conversationId } = payload || {};
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.CALL_REJECTED, {
          conversationId,
          fromUserId: userId,
        });
      }
      endCallForUser(userId, "rejected");
    });

    socket.on(SOCKET_EVENTS.CALL_ENDED, (payload) => {
      const { targetUserId } = payload || {};
      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit(SOCKET_EVENTS.CALL_ENDED, {
          fromUserId: userId,
        });
      }
      endCallForUser(userId, "ended");
    });

    socket.on("disconnect", () => {
      endCallForUser(userId, "disconnect");
    });
  });
}

module.exports = { registerCallHandlers };
