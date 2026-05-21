const { deleteMessageForEveryone } = require("../services/conversation.service");
const { shouldEmitToUser } = require("../services/block.service");

async function deleteMessage(req, res) {
  try {
    const { scope } = req.body || {};
    if (scope !== "for_everyone") {
      return res.status(400).json({ message: 'scope debe ser "for_everyone"' });
    }

    const { message, participantIds } = await deleteMessageForEveryone(
      req.params.id,
      req.user.id
    );

    const io = req.app.get("io");
    for (const participantId of participantIds) {
      const senderId = message.senderId;
      const canEmit = await shouldEmitToUser(senderId, participantId);
      if (!canEmit) continue;
      io.to(`user:${participantId}`).emit("message:deleted", { message });
      io.to(`conversation:${message.conversationId}`).emit("message:deleted", { message });
    }

    return res.json({ message });
  } catch (error) {
    if (error.code === "MESSAGE_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === "FORBIDDEN_DELETE") {
      return res.status(403).json({ message: error.message });
    }
    if (error.code === "FORBIDDEN_CONVERSATION") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo eliminar el mensaje" });
  }
}

module.exports = { deleteMessage };
