const mongoose = require("mongoose");
const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");
const User = require("../models/User.model");
const { toPublicUser } = require("../utils/user.util");
const {
  assertConversationAccess,
  normalizeMessage,
  getUnreadCount,
  getLastVisibleMessage,
  isConversationMutedForUser,
  createSystemMessage,
} = require("./conversation.service");

function uniqueObjectIds(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    const s = id.toString();
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(new mongoose.Types.ObjectId(s));
  }
  return out;
}

function idsToStrings(arr) {
  return (arr || []).map((id) => id.toString());
}

function isGroupAdmin(conversation, userId) {
  return (conversation.adminIds || []).some((id) => id.toString() === userId.toString());
}

async function getUserDisplayName(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return "Usuario";
  return user.nickname?.trim() || user.name?.trim() || user.email?.split("@")[0] || "Usuario";
}

async function normalizeGroupConversation(conversation, viewerId) {
  const conv = conversation.toObject ? conversation.toObject() : conversation;
  const participants = await User.find({ _id: { $in: conv.participants } })
    .select("email name nickname status avatarUrl")
    .lean();

  const lastMessage = await getLastVisibleMessage(conv._id, viewerId);
  const unreadCount = await getUnreadCount(conv._id, viewerId);

  return {
    id: conv._id.toString(),
    type: "group",
    name: conv.name,
    description: conv.description || "",
    avatarUrl: conv.avatarUrl || null,
    participants: participants.map(toPublicUser),
    participantIds: conv.participants.map((id) => id.toString()),
    adminIds: idsToStrings(conv.adminIds),
    createdBy: conv.createdBy?.toString() || null,
    lastMessage: lastMessage ? normalizeMessage(lastMessage) : null,
    muted: isConversationMutedForUser(conv, viewerId),
    unreadCount,
    memberCount: conv.participants.length,
    isAdmin: isGroupAdmin(conv, viewerId),
  };
}

async function createGroupConversation(creatorId, { name, description, memberIds = [], avatarUrl }) {
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    const err = new Error("El nombre del grupo es obligatorio");
    err.code = "INVALID_GROUP";
    throw err;
  }

  const members = uniqueObjectIds([creatorId, ...memberIds]).filter(
    (id) => id.toString() !== creatorId.toString()
  );
  const allParticipants = uniqueObjectIds([creatorId, ...members.map((m) => m.toString())]);

  if (allParticipants.length < 2) {
    const err = new Error("Un grupo debe tener al menos 2 participantes");
    err.code = "INVALID_GROUP";
    throw err;
  }

  const existingUsers = await User.find({ _id: { $in: allParticipants } }).select("_id").lean();
  if (existingUsers.length !== allParticipants.length) {
    const err = new Error("Uno o más usuarios no existen");
    err.code = "INVALID_MEMBERS";
    throw err;
  }

  const conversation = await Conversation.create({
    type: "group",
    name: cleanName,
    description: String(description || "").trim() || null,
    avatarUrl: avatarUrl || null,
    participants: allParticipants,
    adminIds: [new mongoose.Types.ObjectId(creatorId)],
    createdBy: creatorId,
    lastMessageAt: new Date(),
  });

  const creatorName = await getUserDisplayName(creatorId);
  await createSystemMessage({
    conversationId: conversation._id,
    senderId: creatorId,
    systemText: `${creatorName} creó el grupo ${cleanName}`,
  });

  return normalizeGroupConversation(conversation, creatorId);
}

async function getConversationById(conversationId, userId) {
  const conversation = await assertConversationAccess(conversationId, userId);
  if (conversation.type !== "group") {
    const err = new Error("Esta conversación no es un grupo");
    err.code = "NOT_GROUP";
    throw err;
  }
  return normalizeGroupConversation(conversation, userId);
}

async function updateGroupInfo(conversationId, userId, { name, description, avatarUrl }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== "group") {
    const err = new Error("Grupo no encontrado");
    err.code = "NOT_GROUP";
    throw err;
  }
  await assertConversationAccess(conversationId, userId);
  if (!isGroupAdmin(conversation, userId)) {
    const err = new Error("Solo administradores pueden editar el grupo");
    err.code = "FORBIDDEN";
    throw err;
  }

  const actorName = await getUserDisplayName(userId);
  const updates = {};

  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (!cleanName) {
      const err = new Error("El nombre no puede estar vacío");
      err.code = "INVALID_GROUP";
      throw err;
    }
    if (cleanName !== conversation.name) {
      updates.name = cleanName;
    }
  }
  if (description !== undefined) {
    updates.description = String(description).trim() || null;
  }
  if (avatarUrl !== undefined) {
    updates.avatarUrl = avatarUrl || null;
  }

  Object.assign(conversation, updates);
  await conversation.save();

  if (updates.name) {
    await createSystemMessage({
      conversationId,
      senderId: userId,
      systemText: `${actorName} cambió el nombre del grupo a "${updates.name}"`,
    });
  }

  return normalizeGroupConversation(conversation, userId);
}

async function addGroupMembers(conversationId, actorId, memberIds) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== "group") {
    const err = new Error("Grupo no encontrado");
    err.code = "NOT_GROUP";
    throw err;
  }
  await assertConversationAccess(conversationId, actorId);
  if (!isGroupAdmin(conversation, actorId)) {
    const err = new Error("Solo administradores pueden agregar miembros");
    err.code = "FORBIDDEN";
    throw err;
  }

  const newIds = uniqueObjectIds(memberIds).filter(
    (id) => !conversation.participants.some((p) => p.toString() === id.toString())
  );
  if (!newIds.length) {
    return normalizeGroupConversation(conversation, actorId);
  }

  const users = await User.find({ _id: { $in: newIds } }).lean();
  if (users.length !== newIds.length) {
    const err = new Error("Uno o más usuarios no existen");
    err.code = "INVALID_MEMBERS";
    throw err;
  }

  conversation.participants.push(...newIds);
  await conversation.save();

  const actorName = await getUserDisplayName(actorId);
  for (const user of users) {
    const addedName = user.nickname?.trim() || user.name?.trim() || user.email?.split("@")[0];
    await createSystemMessage({
      conversationId,
      senderId: actorId,
      systemText: `${actorName} agregó a ${addedName}`,
    });
  }

  return {
    conversation: await normalizeGroupConversation(conversation, actorId),
    addedUserIds: newIds.map((id) => id.toString()),
  };
}

async function removeGroupMember(conversationId, actorId, targetUserId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== "group") {
    const err = new Error("Grupo no encontrado");
    err.code = "NOT_GROUP";
    throw err;
  }
  await assertConversationAccess(conversationId, actorId);
  if (!isGroupAdmin(conversation, actorId)) {
    const err = new Error("Solo administradores pueden eliminar miembros");
    err.code = "FORBIDDEN";
    throw err;
  }
  if (targetUserId.toString() === actorId.toString()) {
    const err = new Error("Usa salir del grupo para abandonarlo");
    err.code = "INVALID_ACTION";
    throw err;
  }

  const before = conversation.participants.length;
  conversation.participants = conversation.participants.filter(
    (id) => id.toString() !== targetUserId.toString()
  );
  if (conversation.participants.length === before) {
    const err = new Error("El usuario no es miembro del grupo");
    err.code = "NOT_MEMBER";
    throw err;
  }
  if (conversation.participants.length < 1) {
    const err = new Error("El grupo no puede quedar sin participantes");
    err.code = "INVALID_GROUP";
    throw err;
  }

  conversation.adminIds = (conversation.adminIds || []).filter(
    (id) => id.toString() !== targetUserId.toString()
  );
  await conversation.save();

  const actorName = await getUserDisplayName(actorId);
  const removedName = await getUserDisplayName(targetUserId);
  await createSystemMessage({
    conversationId,
    senderId: actorId,
    systemText: `${actorName} eliminó a ${removedName}`,
  });

  return {
    conversation: await normalizeGroupConversation(conversation, actorId),
    removedUserId: targetUserId.toString(),
  };
}

async function leaveGroup(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== "group") {
    const err = new Error("Grupo no encontrado");
    err.code = "NOT_GROUP";
    throw err;
  }
  await assertConversationAccess(conversationId, userId);

  const userName = await getUserDisplayName(userId);
  conversation.participants = conversation.participants.filter(
    (id) => id.toString() !== userId.toString()
  );
  conversation.adminIds = (conversation.adminIds || []).filter(
    (id) => id.toString() !== userId.toString()
  );
  conversation.mutedBy = (conversation.mutedBy || []).filter(
    (id) => id.toString() !== userId.toString()
  );

  if (conversation.participants.length === 0) {
    await Conversation.deleteOne({ _id: conversation._id });
    return { deleted: true, conversationId: conversation._id.toString(), leftUserId: userId.toString() };
  }

  if ((conversation.adminIds || []).length === 0) {
    conversation.adminIds = [conversation.participants[0]];
  }

  await conversation.save();
  await createSystemMessage({
    conversationId,
    senderId: userId,
    systemText: `${userName} salió del grupo`,
  });

  return {
    deleted: false,
    conversation: await normalizeGroupConversation(conversation, conversation.participants[0]),
    leftUserId: userId.toString(),
    participantIds: conversation.participants.map((id) => id.toString()),
  };
}

async function makeGroupAdmin(conversationId, actorId, targetUserId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== "group") {
    const err = new Error("Grupo no encontrado");
    err.code = "NOT_GROUP";
    throw err;
  }
  await assertConversationAccess(conversationId, actorId);
  if (!isGroupAdmin(conversation, actorId)) {
    const err = new Error("Solo administradores pueden asignar administradores");
    err.code = "FORBIDDEN";
    throw err;
  }
  if (!conversation.participants.some((id) => id.toString() === targetUserId.toString())) {
    const err = new Error("El usuario no es miembro del grupo");
    err.code = "NOT_MEMBER";
    throw err;
  }
  if (isGroupAdmin(conversation, targetUserId)) {
    return normalizeGroupConversation(conversation, actorId);
  }

  conversation.adminIds.push(new mongoose.Types.ObjectId(targetUserId));
  await conversation.save();

  const targetName = await getUserDisplayName(targetUserId);
  await createSystemMessage({
    conversationId,
    senderId: actorId,
    systemText: `${targetName} ahora es administrador`,
  });

  return normalizeGroupConversation(conversation, actorId);
}

async function removeGroupAdmin(conversationId, actorId, targetUserId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== "group") {
    const err = new Error("Grupo no encontrado");
    err.code = "NOT_GROUP";
    throw err;
  }
  await assertConversationAccess(conversationId, actorId);
  if (!isGroupAdmin(conversation, actorId)) {
    const err = new Error("Solo administradores pueden quitar administradores");
    err.code = "FORBIDDEN";
    throw err;
  }
  if (!isGroupAdmin(conversation, targetUserId)) {
    return normalizeGroupConversation(conversation, actorId);
  }
  if ((conversation.adminIds || []).length <= 1) {
    const err = new Error("Debe quedar al menos un administrador");
    err.code = "INVALID_GROUP";
    throw err;
  }

  conversation.adminIds = conversation.adminIds.filter(
    (id) => id.toString() !== targetUserId.toString()
  );
  await conversation.save();

  const targetName = await getUserDisplayName(targetUserId);
  await createSystemMessage({
    conversationId,
    senderId: actorId,
    systemText: `${targetName} ya no es administrador`,
  });

  return normalizeGroupConversation(conversation, actorId);
}

module.exports = {
  createGroupConversation,
  getConversationById,
  updateGroupInfo,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  makeGroupAdmin,
  removeGroupAdmin,
  normalizeGroupConversation,
  isGroupAdmin,
};
