const mongoose = require("mongoose");
const User = require("../models/User.model");
const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");
const { isUserBlocked } = require("./block.service");
const { getUnreadCount, getLastVisibleMessage } = require("./conversation.service");
const { toPublicUser, normalizeNickname } = require("../utils/user.util");

function isConversationMutedForUser(conversation, userId) {
  return (conversation.mutedBy || []).some((id) => id.toString() === userId.toString());
}

async function updateProfile(userId, { nickname, status, avatarUrl }) {
  const updates = {};
  if (typeof nickname === "string") {
    const value = nickname.trim();
    if (value && (value.length < 2 || value.length > 30)) {
      const err = new Error("El nickname debe tener entre 2 y 30 caracteres");
      err.code = "INVALID_NICKNAME";
      throw err;
    }
    if (value) {
      updates.nickname = value;
      updates.nicknameKey = normalizeNickname(value);
    }
  }
  if (typeof status === "string") {
    updates.status = status.trim().slice(0, 120) || "Disponible";
  }
  if (typeof avatarUrl === "string") {
    updates.avatarUrl = avatarUrl;
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { returnDocument: "after" }
    );
    return toPublicUser(user);
  } catch (error) {
    if (error && error.code === 11000) {
      const err = new Error("Ese nickname ya está en uso");
      err.code = "NICKNAME_IN_USE";
      throw err;
    }
    throw error;
  }
}

async function searchUsers(currentUserId, query) {
  const term = String(query || "").trim();
  if (!term) return [];
  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ nickname: regex }, { email: regex }],
  })
    .sort({ nickname: 1 })
    .limit(20)
    .lean();
  return users.map((u) => toPublicUser(u));
}

async function listDirectoryUsers(currentUserId, query) {
  const term = String(query || "").trim();
  const filter = { _id: { $ne: currentUserId } };
  if (term) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ nickname: regex }, { email: regex }, { name: regex }];
  }
  const users = await User.find(filter).sort({ nickname: 1, name: 1 }).limit(200).lean();
  return users.map((u) => toPublicUser(u));
}

function normalizeLastMessagePreview(lastMessage) {
  if (!lastMessage) return null;
  const deleted = Boolean(lastMessage.deletedForEveryone);
  return {
    id: lastMessage._id.toString(),
    conversationId: lastMessage.conversationId.toString(),
    type: lastMessage.type || "text",
    content: deleted ? "" : lastMessage.content || "",
    imageUrl: deleted ? null : lastMessage.imageUrl || null,
    documentUrl: deleted ? null : lastMessage.documentUrl || null,
    voiceUrl: deleted ? null : lastMessage.voiceUrl || null,
    fileName: deleted ? null : lastMessage.fileName || null,
    senderId: lastMessage.sender.toString(),
    createdAt: lastMessage.createdAt,
    deletedForEveryone: deleted,
    deliveredBy: (lastMessage.deliveredBy || []).map((id) => id.toString()),
    readBy: (lastMessage.readBy || []).map((id) => id.toString()),
  };
}

async function getContacts(currentUserId) {
  const conversations = await Conversation.find({
    type: "direct",
    participants: currentUserId,
  })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate("participants", "email name nickname status avatarUrl")
    .lean();

  const items = await Promise.all(
    conversations.map(async (conversation) => {
      const contact = conversation.participants.find(
        (p) => p._id.toString() !== currentUserId.toString()
      );
      if (!contact) return null;

      const contactId = contact._id.toString();
      const blockedByMe = await isUserBlocked(currentUserId, contactId);

      const lastMessage = await getLastVisibleMessage(conversation._id, currentUserId);
      const unreadCount = await getUnreadCount(conversation._id, currentUserId);

      return {
        conversationId: conversation._id.toString(),
        user: toPublicUser(contact),
        lastMessage: normalizeLastMessagePreview(lastMessage),
        muted: isConversationMutedForUser(conversation, currentUserId),
        blockedByMe,
        blocked: blockedByMe,
        unreadCount,
        sortAt: lastMessage?.createdAt || conversation.lastMessageAt || conversation.updatedAt,
      };
    })
  );

  return items
    .filter(Boolean)
    .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
    .map(({ sortAt, ...item }) => item);
}

async function getRelatedUserIdsForRealtime(currentUserId) {
  const conversations = await Conversation.find({
    type: "direct",
    participants: currentUserId,
  })
    .select("participants")
    .lean();

  const ids = new Set();
  conversations.forEach((conversation) => {
    conversation.participants.forEach((participantId) => {
      const id = participantId.toString();
      if (id !== currentUserId.toString()) {
        ids.add(id);
      }
    });
  });

  return [...ids];
}

module.exports = {
  normalizeNickname,
  toPublicUser,
  updateProfile,
  searchUsers,
  listDirectoryUsers,
  getContacts,
  getRelatedUserIdsForRealtime,
};
