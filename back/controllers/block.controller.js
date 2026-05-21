const { blockUser, unblockUser, getBlockedUsers } = require("../services/block.service");
async function block(req, res) {
  try {
    const { targetUserId } = req.body || {};
    if (!targetUserId) {
      return res.status(400).json({ message: "targetUserId requerido" });
    }
    const { user } = await blockUser(req.user.id, targetUserId);
    const io = req.app.get("io");
    io.to(`user:${req.user.id}`).emit("user:blocked", { userId: targetUserId, user });
    io.to(`user:${targetUserId}`).emit("contacts:refresh");
    return res.json({ ok: true, user });
  } catch (error) {
    if (error.code === "INVALID_TARGET") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === "TARGET_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }
    console.error("block:", error.message);
    return res.status(500).json({ message: "No se pudo bloquear" });
  }
}

async function unblock(req, res) {
  try {
    const { targetUserId } = req.body || {};
    if (!targetUserId) {
      return res.status(400).json({ message: "targetUserId requerido" });
    }
    const { user } = await unblockUser(req.user.id, targetUserId);
    const io = req.app.get("io");
    io.to(`user:${req.user.id}`).emit("user:unblocked", { userId: targetUserId, user });
    return res.json({ ok: true, user });
  } catch (error) {
    if (error.code === "INVALID_TARGET") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo desbloquear" });
  }
}

async function listBlocked(req, res) {
  try {
    const users = await getBlockedUsers(req.user.id);
    return res.json({ users });
  } catch {
    return res.status(500).json({ message: "No se pudo cargar bloqueados" });
  }
}

module.exports = { block, unblock, listBlocked };
