const path = require("path");
const {
  updateProfile,
  searchUsers,
  listDirectoryUsers,
  getContacts,
  getRelatedUserIdsForRealtime,
  toPublicUser,
} = require("../services/user.service");

function avatarUrlFromFile(req, file) {
  if (!file) return "";
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/avatars/${path.basename(file.filename)}`;
}

async function updateMyProfile(req, res) {
  try {
    const userId = req.user.id;
    const avatarUrl = req.file ? avatarUrlFromFile(req, req.file) : undefined;
    const user = await updateProfile(userId, {
      nickname: req.body?.nickname,
      status: req.body?.status,
      avatarUrl,
    });
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("user:updated", { user });
    const relatedUserIds = await getRelatedUserIdsForRealtime(userId);
    relatedUserIds.forEach((relatedUserId) => {
      io.to(`user:${relatedUserId}`).emit("contacts:refresh");
    });
    return res.json({ user });
  } catch (error) {
    if (error.code === "INVALID_NICKNAME") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === "NICKNAME_IN_USE") {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: "No se pudo actualizar el perfil" });
  }
}

async function me(req, res) {
  return res.json({ user: toPublicUser({ _id: req.user.id, ...req.user }) });
}

async function search(req, res) {
  try {
    const results = await searchUsers(req.user.id, req.query.q);
    return res.json({ users: results });
  } catch {
    return res.status(500).json({ message: "No se pudo buscar usuarios" });
  }
}

async function contacts(req, res) {
  try {
    const items = await getContacts(req.user.id);
    return res.json({ contacts: items });
  } catch {
    return res.status(500).json({ message: "No se pudo cargar contactos" });
  }
}

async function directory(req, res) {
  try {
    const users = await listDirectoryUsers(req.user.id, req.query.q);
    return res.json({ users });
  } catch {
    return res.status(500).json({ message: "No se pudo cargar el directorio de usuarios" });
  }
}

module.exports = {
  updateMyProfile,
  me,
  search,
  contacts,
  directory,
};
