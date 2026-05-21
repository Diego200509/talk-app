const {
  getOrCreateDirectConversation,
  listConversationMessages,
  muteConversation,
  unmuteConversation,
} = require("../services/conversation.service");
const { shouldEmitToUser } = require("../services/block.service");

async function getOrCreateDirect(req, res) {
  try {
    const conversation = await getOrCreateDirectConversation(req.user.id, req.body?.targetUserId);
    const io = req.app.get("io");
    for (const participantId of conversation.participantIds) {
      const canEmit = await shouldEmitToUser(req.user.id, participantId);
      if (canEmit) {
        io.to(`user:${participantId}`).emit("contacts:refresh");
      }
    }
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
  listMessages,
  mute,
  unmute,
};
