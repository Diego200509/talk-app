const SOCKET_EVENTS = {
  CONVERSATION_JOIN: "conversation:join",
  CONVERSATION_LEAVE: "conversation:leave",
  MESSAGE_SEND: "message:send",
  MESSAGE_NEW: "message:new",
  CONVERSATION_UPDATED: "conversation:updated",
  CONTACTS_REFRESH: "contacts:refresh",
  USER_UPDATED: "user:updated",
  CHAT_ERROR: "chat:error",

  USERS_ONLINE: "users:online",
  USER_TYPING: "user:typing",
  USER_STOPPED_TYPING: "user:stopped-typing",
  CONVERSATION_HISTORY: "conversation:history",
  MESSAGE_DELETED: "message:deleted",
  MESSAGE_DELIVERED: "message:delivered",
  MESSAGE_READ: "message:read",
  CONVERSATION_MUTED: "conversation:muted",
  CONVERSATION_UNMUTED: "conversation:unmuted",
  CONVERSATION_UNREAD_UPDATED: "conversation:unread_updated",
  CONVERSATION_READ: "conversation:read",
  USER_BLOCKED: "user:blocked",
  USER_UNBLOCKED: "user:unblocked",
};

module.exports = { SOCKET_EVENTS };
