function toPublicUser(userDoc) {
  if (!userDoc) return null;
  const id = userDoc._id ? userDoc._id.toString() : userDoc.id;
  return {
    id,
    email: userDoc.email,
    name: userDoc.name || "",
    nickname: userDoc.nickname || "",
    status: userDoc.status || "Disponible",
    avatarUrl: userDoc.avatarUrl || "",
  };
}

function normalizeNickname(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

module.exports = { toPublicUser, normalizeNickname };
