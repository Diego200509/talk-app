const mongoose = require("mongoose");
const User = require("../models/User.model");
const { toPublicUser } = require("../utils/user.util");

async function isUserBlocked(blockerId, targetId) {
  const user = await User.findById(blockerId).select("blockedUsers").lean();
  if (!user) return false;
  return (user.blockedUsers || []).some((id) => id.toString() === targetId.toString());
}

async function isBlockedEitherWay(userA, userB) {
  const [aBlockedB, bBlockedA] = await Promise.all([
    isUserBlocked(userA, userB),
    isUserBlocked(userB, userA),
  ]);
  return aBlockedB || bBlockedA;
}

async function blockUser(blockerId, targetUserId) {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error("Usuario inválido");
    err.code = "INVALID_TARGET";
    throw err;
  }
  if (blockerId.toString() === targetUserId.toString()) {
    const err = new Error("No puedes bloquearte a ti mismo");
    err.code = "INVALID_TARGET";
    throw err;
  }

  const target = await User.findById(targetUserId).lean();
  if (!target) {
    const err = new Error("Usuario no encontrado");
    err.code = "TARGET_NOT_FOUND";
    throw err;
  }

  await User.findByIdAndUpdate(blockerId, {
    $addToSet: { blockedUsers: target._id },
  });

  return { user: toPublicUser(target) };
}

async function unblockUser(blockerId, targetUserId) {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error("Usuario inválido");
    err.code = "INVALID_TARGET";
    throw err;
  }

  await User.findByIdAndUpdate(blockerId, {
    $pull: { blockedUsers: new mongoose.Types.ObjectId(targetUserId) },
  });

  const target = await User.findById(targetUserId).lean();
  return { user: target ? toPublicUser(target) : null };
}

async function getBlockedUsers(userId) {
  const user = await User.findById(userId)
    .populate("blockedUsers", "email name nickname status avatarUrl")
    .lean();
  if (!user) return [];
  return (user.blockedUsers || []).map((u) => toPublicUser(u));
}

/** Si receiver bloqueó a sender, no emitir hacia receiver */
async function shouldEmitToUser(senderId, receiverId) {
  if (await isUserBlocked(receiverId, senderId)) return false;
  return true;
}

module.exports = {
  isUserBlocked,
  isBlockedEitherWay,
  blockUser,
  unblockUser,
  getBlockedUsers,
  shouldEmitToUser,
};
