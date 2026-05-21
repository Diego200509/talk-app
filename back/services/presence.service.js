const socketsByUser = new Map();

function addConnection(userId, socketId) {
  const key = String(userId);
  if (!socketsByUser.has(key)) {
    socketsByUser.set(key, new Set());
  }
  socketsByUser.get(key).add(socketId);
}

function removeConnection(userId, socketId) {
  const key = String(userId);
  const set = socketsByUser.get(key);
  if (!set) return { wentOffline: false, wasOnline: false };
  set.delete(socketId);
  if (set.size === 0) {
    socketsByUser.delete(key);
    return { wentOffline: true, wasOnline: true };
  }
  return { wentOffline: false, wasOnline: true };
}

function isUserOnline(userId) {
  const set = socketsByUser.get(String(userId));
  return Boolean(set && set.size > 0);
}

function getOnlineUserIds() {
  return [...socketsByUser.keys()];
}

/** Usuarios online visibles para quien consulta (intersección con relacionados). */
function getVisibleOnlineUsers(viewerUserId, relatedUserIds) {
  const related = new Set(relatedUserIds.map(String));
  return getOnlineUserIds().filter((id) => id !== String(viewerUserId) && related.has(id));
}

module.exports = {
  addConnection,
  removeConnection,
  isUserOnline,
  getOnlineUserIds,
  getVisibleOnlineUsers,
};
