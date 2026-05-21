"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, ChatUser } from "@/types/chat";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { getSocket } from "@/lib/socket";

export type ConversationUpdatedPayload = {
  conversationId: string;
  message: ChatMessage;
  unreadCount?: number;
};

export type UnreadUpdatedPayload = {
  conversationId: string;
  unreadCount: number;
};

type Params = {
  token: string | null;
  onMessage: (message: ChatMessage) => void;
  onConversationUpdated: (payload: ConversationUpdatedPayload) => void;
  onUnreadUpdated?: (payload: UnreadUpdatedPayload) => void;
  onContactsRefresh?: () => void;
  onUserUpdated?: (user: ChatUser) => void;
  onSocketError?: (message: string) => void;
  onConversationHistory?: (payload: { conversationId: string; messages: ChatMessage[] }) => void;
  onMessageDeleted?: (message: ChatMessage) => void;
  onMessageDelivered?: (message: ChatMessage) => void;
  onMessageRead?: (message: ChatMessage) => void;
  onUserTyping?: (payload: { conversationId: string; userId: string }) => void;
  onUserStoppedTyping?: (payload: { conversationId: string; userId: string }) => void;
  onConversationMuted?: (payload: { conversationId: string; muted: boolean }) => void;
  onConversationUnmuted?: (payload: { conversationId: string; muted: boolean }) => void;
  onUserBlocked?: (payload: { userId: string }) => void;
  onUserUnblocked?: (payload: { userId: string }) => void;
};

export function useChatSocket(handlers: Params) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!handlers.token) return;
    const socket = getSocket(handlers.token);

    const onMessage = (message: ChatMessage) => handlersRef.current.onMessage(message);
    const onConversationUpdated = (payload: ConversationUpdatedPayload) =>
      handlersRef.current.onConversationUpdated(payload);
    const onUnreadUpdated = (payload: UnreadUpdatedPayload) =>
      handlersRef.current.onUnreadUpdated?.(payload);
    const onContactsRefresh = () => handlersRef.current.onContactsRefresh?.();
    const onUserUpdated = (payload: { user?: ChatUser }) => {
      if (payload?.user) handlersRef.current.onUserUpdated?.(payload.user);
    };
    const onSocketError = (payload: { message?: string }) => {
      handlersRef.current.onSocketError?.(payload?.message || "Error de socket");
    };
    const onConversationHistory = (payload: { conversationId: string; messages: ChatMessage[] }) =>
      handlersRef.current.onConversationHistory?.(payload);
    const onMessageDeleted = (payload: { message?: ChatMessage }) => {
      if (payload?.message) handlersRef.current.onMessageDeleted?.(payload.message);
    };
    const onMessageDelivered = (payload: { message?: ChatMessage }) => {
      if (payload?.message) handlersRef.current.onMessageDelivered?.(payload.message);
    };
    const onMessageRead = (payload: { message?: ChatMessage }) => {
      if (payload?.message) handlersRef.current.onMessageRead?.(payload.message);
    };
    const onUserTyping = (payload: { conversationId: string; userId: string }) =>
      handlersRef.current.onUserTyping?.(payload);
    const onUserStoppedTyping = (payload: { conversationId: string; userId: string }) =>
      handlersRef.current.onUserStoppedTyping?.(payload);
    const onConversationMuted = (payload: { conversationId: string }) => {
      if (payload?.conversationId) {
        handlersRef.current.onConversationMuted?.({ conversationId: payload.conversationId, muted: true });
      }
    };
    const onConversationUnmuted = (payload: { conversationId: string }) => {
      if (payload?.conversationId) {
        handlersRef.current.onConversationUnmuted?.({ conversationId: payload.conversationId, muted: false });
      }
    };
    const onUserBlocked = (payload: { userId?: string }) => {
      if (payload?.userId) handlersRef.current.onUserBlocked?.({ userId: payload.userId });
    };
    const onUserUnblocked = (payload: { userId?: string }) => {
      if (payload?.userId) handlersRef.current.onUserUnblocked?.({ userId: payload.userId });
    };

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onMessage);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
    socket.on(SOCKET_EVENTS.CONVERSATION_UNREAD_UPDATED, onUnreadUpdated);
    socket.on(SOCKET_EVENTS.CONTACTS_REFRESH, onContactsRefresh);
    socket.on(SOCKET_EVENTS.USER_UPDATED, onUserUpdated);
    socket.on(SOCKET_EVENTS.CHAT_ERROR, onSocketError);
    socket.on(SOCKET_EVENTS.CONVERSATION_HISTORY, onConversationHistory);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, onMessageDeleted);
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, onMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE_READ, onMessageRead);
    socket.on(SOCKET_EVENTS.USER_TYPING, onUserTyping);
    socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING, onUserStoppedTyping);
    socket.on(SOCKET_EVENTS.CONVERSATION_MUTED, onConversationMuted);
    socket.on(SOCKET_EVENTS.CONVERSATION_UNMUTED, onConversationUnmuted);
    socket.on(SOCKET_EVENTS.USER_BLOCKED, onUserBlocked);
    socket.on(SOCKET_EVENTS.USER_UNBLOCKED, onUserUnblocked);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onMessage);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
      socket.off(SOCKET_EVENTS.CONVERSATION_UNREAD_UPDATED, onUnreadUpdated);
      socket.off(SOCKET_EVENTS.CONTACTS_REFRESH, onContactsRefresh);
      socket.off(SOCKET_EVENTS.USER_UPDATED, onUserUpdated);
      socket.off(SOCKET_EVENTS.CHAT_ERROR, onSocketError);
      socket.off(SOCKET_EVENTS.CONVERSATION_HISTORY, onConversationHistory);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, onMessageDeleted);
      socket.off(SOCKET_EVENTS.MESSAGE_DELIVERED, onMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE_READ, onMessageRead);
      socket.off(SOCKET_EVENTS.USER_TYPING, onUserTyping);
      socket.off(SOCKET_EVENTS.USER_STOPPED_TYPING, onUserStoppedTyping);
      socket.off(SOCKET_EVENTS.CONVERSATION_MUTED, onConversationMuted);
      socket.off(SOCKET_EVENTS.CONVERSATION_UNMUTED, onConversationUnmuted);
      socket.off(SOCKET_EVENTS.USER_BLOCKED, onUserBlocked);
      socket.off(SOCKET_EVENTS.USER_UNBLOCKED, onUserUnblocked);
    };
  }, [handlers.token]);
}
