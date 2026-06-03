const { SOCKET_EVENTS } = require("../constants/socket-events");
const {
  getOrCreateDirectConversation,
  listConversationMessages,
  muteConversation,
  unmuteConversation,
  assertConversationAccess,
  getMessageHistory,
} = require("../services/conversation.service");
const {
  createGroupConversation,
  getConversationById,
  updateGroupInfo,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  makeGroupAdmin,
  removeGroupAdmin,
} = require("../services/group.service");
const { shouldEmitToUser } = require("../services/block.service");
const Message = require("../models/Message.model");

async function emitToParticipants(io, fromUserId, participantIds, event, payload) {
  for (const participantId of participantIds) {
    const canEmit = await shouldEmitToUser(fromUserId, participantId);
    if (canEmit) {
      io.to(`user:${participantId}`).emit(event, payload);
    }
  }
}

async function refreshContacts(io, fromUserId, participantIds) {
  await emitToParticipants(io, fromUserId, participantIds, SOCKET_EVENTS.CONTACTS_REFRESH);
}

async function getOrCreateDirect(req, res) {
  try {
    const conversation = await getOrCreateDirectConversation(req.user.id, req.body?.targetUserId);
    const io = req.app.get("io");
    await refreshContacts(io, req.user.id, conversation.participantIds);
    return res.json({ conversation });
  } catch (error) {
    if (error.code === "INVALID_TARGET") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === "TARGET_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === "USER_BLOCKED" || error.code === "USER_BLOCKED_SENDER") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo crear/obtener la conversación" });
  }
}

async function getConversation(req, res) {
  try {
    const conversation = await assertConversationAccess(req.params.id, req.user.id);
    if (conversation.type === "group") {
      const group = await getConversationById(req.params.id, req.user.id);
      return res.json({ conversation: group });
    }
    return res.status(400).json({ message: "Usa /direct para chats 1 a 1" });
  } catch (error) {
    if (error.code === "CONVERSATION_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === "FORBIDDEN_CONVERSATION") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo cargar la conversación" });
  }
}

async function createGroup(req, res) {
  try {
    const { name, description, memberIds, avatarUrl } = req.body || {};
    const conversation = await createGroupConversation(req.user.id, {
      name,
      description,
      memberIds,
      avatarUrl,
    });
    const io = req.app.get("io");
    const systemMsg = await Message.findOne({ conversationId: conversation.id, type: "system" })
      .sort({ createdAt: -1 })
      .lean();

    await emitToParticipants(io, req.user.id, conversation.participantIds, SOCKET_EVENTS.GROUP_CREATED, {
      conversation,
    });
    await refreshContacts(io, req.user.id, conversation.participantIds);

    if (systemMsg) {
      const { normalizeMessage } = require("../services/conversation.service");
      await emitToParticipants(io, req.user.id, conversation.participantIds, SOCKET_EVENTS.MESSAGE_NEW, {
        ...normalizeMessage(systemMsg),
      });
    }

    return res.status(201).json({ conversation });
  } catch (error) {
    if (error.code === "INVALID_GROUP" || error.code === "INVALID_MEMBERS") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo crear el grupo" });
  }
}

async function updateGroup(req, res) {
  try {
    const conversation = await updateGroupInfo(req.params.id, req.user.id, req.body || {});
    const io = req.app.get("io");
    await emitToParticipants(io, req.user.id, conversation.participantIds, SOCKET_EVENTS.GROUP_UPDATED, {
      conversation,
    });
    await refreshContacts(io, req.user.id, conversation.participantIds);
    return res.json({ conversation });
  } catch (error) {
    if (error.code === "NOT_GROUP") return res.status(404).json({ message: error.message });
    if (error.code === "FORBIDDEN") return res.status(403).json({ message: error.message });
    if (error.code === "INVALID_GROUP") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "No se pudo actualizar el grupo" });
  }
}

async function addMembers(req, res) {
  try {
    const { memberIds } = req.body || {};
    const result = await addGroupMembers(req.params.id, req.user.id, memberIds || []);
    const io = req.app.get("io");
    const allIds = [...new Set([...result.conversation.participantIds, ...result.addedUserIds])];
    await emitToParticipants(io, req.user.id, allIds, SOCKET_EVENTS.GROUP_MEMBER_ADDED, {
      conversationId: req.params.id,
      conversation: result.conversation,
      addedUserIds: result.addedUserIds,
    });
    await refreshContacts(io, req.user.id, allIds);
    return res.json(result);
  } catch (error) {
    if (error.code === "NOT_GROUP") return res.status(404).json({ message: error.message });
    if (error.code === "FORBIDDEN") return res.status(403).json({ message: error.message });
    if (error.code === "INVALID_MEMBERS") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "No se pudieron agregar miembros" });
  }
}

async function removeMember(req, res) {
  try {
    const result = await removeGroupMember(req.params.id, req.user.id, req.params.userId);
    const io = req.app.get("io");
    await emitToParticipants(
      io,
      req.user.id,
      [...result.conversation.participantIds, result.removedUserId],
      SOCKET_EVENTS.GROUP_MEMBER_REMOVED,
      {
        conversationId: req.params.id,
        conversation: result.conversation,
        removedUserId: result.removedUserId,
      }
    );
    io.to(`user:${result.removedUserId}`).emit(SOCKET_EVENTS.CONTACTS_REFRESH);
    await refreshContacts(io, req.user.id, result.conversation.participantIds);
    return res.json(result);
  } catch (error) {
    if (error.code === "NOT_GROUP" || error.code === "NOT_MEMBER") {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === "FORBIDDEN" || error.code === "INVALID_ACTION") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo eliminar el miembro" });
  }
}

async function leaveGroupHandler(req, res) {
  try {
    const result = await leaveGroup(req.params.id, req.user.id);
    const io = req.app.get("io");
    if (result.deleted) {
      io.to(`user:${result.leftUserId}`).emit(SOCKET_EVENTS.GROUP_LEFT, {
        conversationId: result.conversationId,
        leftUserId: result.leftUserId,
        deleted: true,
      });
      io.to(`user:${result.leftUserId}`).emit(SOCKET_EVENTS.CONTACTS_REFRESH);
      return res.json(result);
    }
    await emitToParticipants(io, req.user.id, result.participantIds, SOCKET_EVENTS.GROUP_LEFT, {
      conversationId: req.params.id,
      conversation: result.conversation,
      leftUserId: result.leftUserId,
    });
    io.to(`user:${result.leftUserId}`).emit(SOCKET_EVENTS.CONTACTS_REFRESH);
    await refreshContacts(io, req.user.id, result.participantIds);
    return res.json(result);
  } catch (error) {
    if (error.code === "NOT_GROUP") return res.status(404).json({ message: error.message });
    if (error.code === "FORBIDDEN_CONVERSATION") return res.status(403).json({ message: error.message });
    return res.status(500).json({ message: "No se pudo salir del grupo" });
  }
}

async function makeAdmin(req, res) {
  try {
    const conversation = await makeGroupAdmin(req.params.id, req.user.id, req.params.userId);
    const io = req.app.get("io");
    await emitToParticipants(io, req.user.id, conversation.participantIds, SOCKET_EVENTS.GROUP_ADMIN_ADDED, {
      conversationId: req.params.id,
      conversation,
      userId: req.params.userId,
    });
    return res.json({ conversation });
  } catch (error) {
    if (error.code === "NOT_GROUP" || error.code === "NOT_MEMBER") {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === "FORBIDDEN") return res.status(403).json({ message: error.message });
    return res.status(500).json({ message: "No se pudo asignar administrador" });
  }
}

async function removeAdmin(req, res) {
  try {
    const conversation = await removeGroupAdmin(req.params.id, req.user.id, req.params.userId);
    const io = req.app.get("io");
    await emitToParticipants(io, req.user.id, conversation.participantIds, SOCKET_EVENTS.GROUP_ADMIN_REMOVED, {
      conversationId: req.params.id,
      conversation,
      userId: req.params.userId,
    });
    return res.json({ conversation });
  } catch (error) {
    if (error.code === "NOT_GROUP") return res.status(404).json({ message: error.message });
    if (error.code === "FORBIDDEN" || error.code === "INVALID_GROUP") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo quitar administrador" });
  }
}

async function listMessages(req, res) {
  try {
    const messages = await listConversationMessages(req.params.id, req.user.id);
    return res.json({ messages });
  } catch (error) {
    if (error.code === "CONVERSATION_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === "FORBIDDEN_CONVERSATION") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo cargar mensajes" });
  }
}

async function mute(req, res) {
  try {
    const result = await muteConversation(req.params.id, req.user.id);
    const io = req.app.get("io");
    io.to(`user:${req.user.id}`).emit("conversation:muted", result);
    return res.json(result);
  } catch (error) {
    if (error.code === "CONVERSATION_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === "FORBIDDEN_CONVERSATION") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo silenciar" });
  }
}

async function unmute(req, res) {
  try {
    const result = await unmuteConversation(req.params.id, req.user.id);
    const io = req.app.get("io");
    io.to(`user:${req.user.id}`).emit("conversation:unmuted", result);
    return res.json(result);
  } catch (error) {
    if (error.code === "CONVERSATION_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === "FORBIDDEN_CONVERSATION") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo reactivar sonido" });
  }
}

module.exports = {
  getOrCreateDirect,
  getConversation,
  createGroup,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup: leaveGroupHandler,
  makeAdmin,
  removeAdmin,
  listMessages,
  mute,
  unmute,
};
