const {
  getOrCreateDirectConversation,
  listConversationMessages,
} = require("../services/conversation.service");

async function getOrCreateDirect(req, res) {
  try {
    const conversation = await getOrCreateDirectConversation(req.user.id, req.body?.targetUserId);
    const io = req.app.get("io");
    conversation.participantIds.forEach((participantId) => {
      io.to(`user:${participantId}`).emit("contacts:refresh");
    });
    return res.json({ conversation });
  } catch (error) {
    if (error.code === "INVALID_TARGET") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === "TARGET_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
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

module.exports = {
  getOrCreateDirect,
  listMessages,
};
