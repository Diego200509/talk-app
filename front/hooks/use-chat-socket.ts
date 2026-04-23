"use client";

import { useEffect } from "react";
import type { ChatMessage, ChatUser } from "@/types/chat";
import { disconnectSocket, getSocket } from "@/lib/socket";

type Params = {
  token: string | null;
  onMessage: (message: ChatMessage) => void;
  onConversationUpdated: (payload: { conversationId: string; message: ChatMessage }) => void;
  onContactsRefresh?: () => void;
  onUserUpdated?: (user: ChatUser) => void;
  onSocketError?: (message: string) => void;
};

export function useChatSocket({
  token,
  onMessage,
  onConversationUpdated,
  onContactsRefresh,
  onUserUpdated,
  onSocketError,
}: Params) {
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.on("message:new", onMessage);
    socket.on("conversation:updated", onConversationUpdated);
    socket.on("contacts:refresh", () => onContactsRefresh?.());
    socket.on("user:updated", (payload: { user?: ChatUser }) => {
      if (payload?.user) onUserUpdated?.(payload.user);
    });
    socket.on("chat:error", (payload: { message?: string }) => {
      onSocketError?.(payload?.message || "Error de socket");
    });

    return () => {
      socket.off("message:new", onMessage);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("contacts:refresh");
      socket.off("user:updated");
      socket.off("chat:error");
      disconnectSocket();
    };
  }, [token, onMessage, onConversationUpdated, onContactsRefresh, onUserUpdated, onSocketError]);
}
