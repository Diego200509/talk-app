const User = require("../models/User.model");
const Conversation = require("../models/Conversation.model");
const Message = require("../models/Message.model");

function normalizeNickname(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function toPublicUser(userDoc) {
  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name || "",
    nickname: userDoc.nickname || "",
    status: userDoc.status || "Disponible",
    avatarUrl: userDoc.avatarUrl || "",
  };
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

      const lastMessage = await Message.findOne({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .lean();

      return {
        conversationId: conversation._id.toString(),
        user: toPublicUser(contact),
        lastMessage: lastMessage
          ? {
              id: lastMessage._id.toString(),
              content: lastMessage.content,
              senderId: lastMessage.sender.toString(),
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    })
  );

  return items.filter(Boolean);
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
