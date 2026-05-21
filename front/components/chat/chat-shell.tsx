"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellOff, MessageCircle, Search, X } from "lucide-react";
import {
  getContactsRequest,
  getDirectoryUsersRequest,
  updateProfileRequest,
} from "@/lib/api/users";
import {
  getOrCreateDirectConversationRequest,
  getConversationMessagesRequest,
  muteConversationRequest,
  unmuteConversationRequest,
} from "@/lib/api/conversations";
import { deleteMessageForEveryoneRequest } from "@/lib/api/messages";
import { RequireAuth } from "@/components/chat/require-auth";
import { useAuthStore } from "@/stores/auth-store";
import { useChatSocket, type ConversationUpdatedPayload } from "@/hooks/use-chat-socket";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useBlocked } from "@/hooks/use-blocked";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatUser, ContactItem } from "@/types/chat";
import { lastMessagePreviewText } from "@/lib/chat/message-status";
import {
  playNotificationSound,
  requestNotificationPermission,
  showDesktopNotification,
} from "@/lib/notifications/play-notification-sound";
import {
  LeftPanelMode,
  HEADER_H,
  chatListTimestampLabel,
  mergeMessages,
  patchContactWithMessage,
  sidebarTitle,
  upsertMessage,
} from "./chat-shell.helpers";
import {
  Avatar,
  ChatMessageBubble,
  ChatUserStrip,
  ContactsDirectoryPanel,
  ConversationHeaderMenu,
  MessageComposer,
  ProfileEditorPanel,
  MessageStatusChecks,
  TalkAppBrand,
  UnreadBadge,
} from "./chat-shell.parts";

export function ChatShell() {
  const token = useAuthStore((s) => s.token);
  const authUser = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>("chats");
  const [directoryUsers, setDirectoryUsers] = useState<ChatUser[]>([]);
  const [directorySearch, setDirectorySearch] = useState("");
  const [profileNickname, setProfileNickname] = useState("");
  const [profileStatus, setProfileStatus] = useState<string>("Disponible");
  const [profileAvatar, setProfileAvatar] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const notifiedPermissionRef = useRef(false);
  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;

  const { isOnline } = useOnlineUsers(token);
  const { isBlockedByMe, blockUser, unblockUser, refresh: refreshBlocked } = useBlocked(token);

  const activeContact = contacts.find((c) => c.conversationId === activeConversationId);
  const blockedByMe = Boolean(
    activeUser && (isBlockedByMe(activeUser.id) || activeContact?.blockedByMe)
  );
  const blockedMe = Boolean(activeContact?.blockedMe);
  const chatBlocked = Boolean(blockedByMe || blockedMe || activeContact?.blocked);
  const conversationMuted = activeContact?.muted ?? false;

  const chatSearchTerm = searchTerm.trim().toLowerCase();
  const visibleList = contacts
    .map((c) => c.user)
    .filter((user) => {
      if (!chatSearchTerm) return true;
      const nickname = user.nickname?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      const name = user.name?.toLowerCase() || "";
      return nickname.includes(chatSearchTerm) || email.includes(chatSearchTerm) || name.includes(chatSearchTerm);
    });

  const refreshContacts = useCallback(async () => {
    if (!token) return;
    try {
      const list = await getContactsRequest();
      setContacts(list);
      if (!activeConversationId) return;
      const current = list.find((item) => item.conversationId === activeConversationId);
      if (current?.user) {
        setActiveUser(current.user);
      }
    } catch {
      /* 401: el interceptor redirige a login; evitar unhandledRejection */
    }
  }, [activeConversationId, token]);

  useEffect(() => {
    const task = setTimeout(() => {
      void refreshContacts();
    }, 0);
    return () => clearTimeout(task);
  }, [refreshContacts]);

  useEffect(() => {
    if (!notifiedPermissionRef.current) {
      notifiedPermissionRef.current = true;
      void requestNotificationPermission();
    }
  }, []);

  useEffect(() => {
    if (leftPanelMode !== "contacts") return;
    const timeout = setTimeout(async () => {
      const users = await getDirectoryUsersRequest(directorySearch.trim() || undefined);
      setDirectoryUsers(users);
    }, 250);
    return () => clearTimeout(timeout);
  }, [leftPanelMode, directorySearch]);

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!token) return;
      getSocket(token).emit(SOCKET_EVENTS.CONVERSATION_READ, { conversationId });
      setContacts((prev) =>
        prev.map((c) =>
          c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    },
    [token]
  );

  const patchMessageInState = useCallback((message: ChatMessage) => {
    setMessages((prev) => upsertMessage(prev, message));
    setContacts((prev) =>
      prev.map((item) => {
        if (item.conversationId !== message.conversationId) return item;
        return patchContactWithMessage(item, message);
      })
    );
  }, []);

  const updateContactsFromPayload = useCallback((payload: ConversationUpdatedPayload) => {
    setContacts((prev) => {
      const idx = prev.findIndex((item) => item.conversationId === payload.conversationId);
      if (idx === -1) {
        void refreshContacts();
        return prev;
      }
      const next = [...prev];
      const contact = next[idx];
      const isActiveChat = payload.conversationId === activeConversationIdRef.current;
      const unreadCount =
        payload.unreadCount !== undefined
          ? payload.unreadCount
          : isActiveChat
            ? 0
            : contact.unreadCount ?? 0;

      next[idx] = patchContactWithMessage(contact, payload.message, unreadCount);
      next.sort((a, b) => {
        const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bt - at;
      });
      return next;
    });
  }, [authUser?.id, refreshContacts]);

  const notifyIncomingMessage = useCallback(
    (message: ChatMessage, contact?: ContactItem) => {
      if (message.senderId === authUser?.id) return;
      const isActive =
        message.conversationId === activeConversationId &&
        document.visibilityState === "visible";
      if (isActive) return;
      const muted = contact?.muted ?? false;
      if (muted) return;

      playNotificationSound();
      const senderName = contact?.user ? sidebarTitle(contact.user) : "Nuevo mensaje";
      showDesktopNotification(senderName, message.content || "Nuevo mensaje");
    },
    [authUser?.id, activeConversationId]
  );

  const onMessage = useCallback(
    (message: ChatMessage) => {
      const isActive = message.conversationId === activeConversationIdRef.current;
      const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      const fromOther = message.senderId !== authUser?.id;
      const isMine = message.senderId === authUser?.id;

      if (isActive || isMine) {
        setMessages((prev) => upsertMessage(prev, message));
      }
      if (isMine) {
        patchMessageInState(message);
      }
      if (isActive && fromOther && isVisible) {
        markConversationRead(message.conversationId);
      }

      if (fromOther) {
        const contact = contacts.find((c) => c.conversationId === message.conversationId);
        notifyIncomingMessage(message, contact);
      }
    },
    [authUser?.id, contacts, notifyIncomingMessage, markConversationRead, patchMessageInState]
  );

  const onConversationUpdated = useCallback(
    (payload: ConversationUpdatedPayload) => {
      updateContactsFromPayload(payload);
      if (payload.conversationId === activeConversationIdRef.current) {
        setMessages((prev) => upsertMessage(prev, payload.message));
      }
      if (payload.message.senderId !== authUser?.id) {
        const contact = contacts.find((c) => c.conversationId === payload.conversationId);
        notifyIncomingMessage(payload.message, contact);
      }
    },
    [updateContactsFromPayload, authUser?.id, contacts, notifyIncomingMessage]
  );

  const onUnreadUpdated = useCallback(
    (payload: { conversationId: string; unreadCount: number }) => {
      setContacts((prev) =>
        prev.map((c) =>
          c.conversationId === payload.conversationId
            ? { ...c, unreadCount: payload.unreadCount }
            : c
        )
      );
    },
    []
  );

  const onContactsRefresh = useCallback(() => {
    void refreshContacts();
    void refreshBlocked();
    if (leftPanelMode === "contacts") {
      void getDirectoryUsersRequest(directorySearch.trim() || undefined).then(setDirectoryUsers);
    }
  }, [refreshContacts, refreshBlocked, leftPanelMode, directorySearch]);

  const onUserUpdated = useCallback(
    (user: ChatUser) => {
      if (!token) return;
      setSession(token, user);
      setContacts((prev) =>
        prev.map((contact) =>
          contact.user.id === user.id ? { ...contact, user: { ...contact.user, ...user } } : contact
        )
      );
      setActiveUser((prev) => (prev?.id === user.id ? { ...prev, ...user } : prev));
      if (leftPanelMode === "contacts") {
        setDirectoryUsers((prev) => prev.map((entry) => (entry.id === user.id ? { ...entry, ...user } : entry)));
      }
    },
    [token, setSession, leftPanelMode]
  );

  const onConversationHistory = useCallback(
    (payload: { conversationId: string; messages: ChatMessage[] }) => {
      if (payload.conversationId !== activeConversationId) return;
      setMessages((prev) => mergeMessages(prev, payload.messages));
      setLoadingMessages(false);
    },
    [activeConversationId]
  );

  const onMessageDeleted = useCallback((message: ChatMessage) => {
    patchMessageInState(message);
  }, [patchMessageInState]);

  const onMessageDelivered = useCallback(
    (message: ChatMessage) => {
      patchMessageInState(message);
    },
    [patchMessageInState]
  );

  const onMessageRead = useCallback(
    (message: ChatMessage) => {
      patchMessageInState(message);
    },
    [patchMessageInState]
  );

  const onUserTyping = useCallback(
    (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId !== activeConversationId) return;
      if (payload.userId === authUser?.id) return;
      setTypingUserId(payload.userId);
    },
    [activeConversationId, authUser?.id]
  );

  const onUserStoppedTyping = useCallback(
    (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId !== activeConversationId) return;
      setTypingUserId((prev) => (prev === payload.userId ? null : prev));
    },
    [activeConversationId]
  );

  const setConversationMuted = useCallback((conversationId: string, muted: boolean) => {
    setContacts((prev) =>
      prev.map((c) => (c.conversationId === conversationId ? { ...c, muted } : c))
    );
  }, []);

  const onConversationMuted = useCallback(
    (payload: { conversationId: string; muted?: boolean }) => {
      setConversationMuted(payload.conversationId, payload.muted ?? true);
    },
    [setConversationMuted]
  );

  const onConversationUnmuted = useCallback(
    (payload: { conversationId: string; muted?: boolean }) => {
      setConversationMuted(payload.conversationId, payload.muted ?? false);
    },
    [setConversationMuted]
  );

  const onUserBlocked = useCallback(() => {
    void refreshContacts();
    void refreshBlocked();
  }, [refreshContacts, refreshBlocked]);

  const onUserUnblocked = useCallback(() => {
    void refreshContacts();
    void refreshBlocked();
  }, [refreshContacts, refreshBlocked]);

  useChatSocket({
    token,
    onMessage,
    onConversationUpdated,
    onUnreadUpdated,
    onContactsRefresh,
    onUserUpdated,
    onSocketError: setSocketError,
    onConversationHistory,
    onMessageDeleted,
    onMessageDelivered,
    onMessageRead,
    onUserTyping,
    onUserStoppedTyping,
    onConversationMuted,
    onConversationUnmuted,
    onUserBlocked,
    onUserUnblocked,
  });

  useEffect(() => {
    if (!token || !activeConversationId) return;
    const socket = getSocket(token);
    socket.emit(SOCKET_EVENTS.CONVERSATION_JOIN, { conversationId: activeConversationId });
    setTypingUserId(null);
    setContacts((prev) =>
      prev.map((c) =>
        c.conversationId === activeConversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }, [token, activeConversationId]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const convId = activeConversationIdRef.current;
      if (convId) markConversationRead(convId);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [markConversationRead]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (!activeConversationId) return;
      setActiveConversationId(null);
      setActiveUser(null);
      setMessages([]);
      setLoadingMessages(false);
      setLeftPanelMode("chats");
      setTypingUserId(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId || loadingMessages) return;
    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, activeConversationId, loadingMessages]);

  async function openConversationWithUser(user: ChatUser) {
    setActiveUser(user);
    setLeftPanelMode("chats");
    setLoadingMessages(true);
    setSocketError(null);

    const existingContact = contacts.find((c) => c.user.id === user.id);

    try {
      let conversationId = existingContact?.conversationId ?? null;

      if (!conversationId) {
        const conversation = await getOrCreateDirectConversationRequest(user.id);
        conversationId = conversation.id;
        setContacts((prev) => {
          const idx = prev.findIndex((c) => c.conversationId === conversation.id);
          const entry: ContactItem = {
            conversationId: conversation.id,
            user,
            lastMessage: conversation.lastMessage,
            muted: conversation.muted,
            unreadCount: conversation.unreadCount ?? 0,
            blockedByMe: conversation.blockedByMe,
            blockedMe: conversation.blockedMe,
            blocked: conversation.blocked,
          };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...entry };
            return next;
          }
          return [entry, ...prev];
        });
      }

      setActiveConversationId(conversationId);
      const list = await getConversationMessagesRequest(conversationId);
      setMessages(list);

      if (existingContact) {
        setContacts((prev) =>
          prev.map((c) =>
            c.user.id === user.id ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const msg =
        axiosErr.response?.data?.message ||
        (axiosErr.response?.status === 403
          ? "No puedes abrir esta conversación"
          : "No se pudo abrir la conversación");
      setSocketError(msg);
      setActiveConversationId(null);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
    void refreshContacts();
  }

  async function sendMessage(content: string) {
    if (!token || !activeConversationId || chatBlocked) return;
    const socket = getSocket(token);
    socket.emit(SOCKET_EVENTS.MESSAGE_SEND, { conversationId: activeConversationId, content });
  }

  function handleTypingChange(typing: boolean) {
    if (!token || !activeConversationId || chatBlocked) return;
    const socket = getSocket(token);
    if (typing) {
      socket.emit(SOCKET_EVENTS.USER_TYPING, { conversationId: activeConversationId });
    } else {
      socket.emit(SOCKET_EVENTS.USER_STOPPED_TYPING, { conversationId: activeConversationId });
    }
  }

  async function handleDeleteForEveryone(messageId: string) {
    try {
      const message = await deleteMessageForEveryoneRequest(messageId);
      patchMessageInState(message);
    } catch {
      setSocketError("No se pudo eliminar el mensaje");
    }
  }

  async function handleMute() {
    if (!activeConversationId) return;
    await muteConversationRequest(activeConversationId);
    setConversationMuted(activeConversationId, true);
  }

  async function handleUnmute() {
    if (!activeConversationId) return;
    await unmuteConversationRequest(activeConversationId);
    setConversationMuted(activeConversationId, false);
  }

  async function handleBlock() {
    if (!activeUser) return;
    await blockUser(activeUser.id);
    onUserBlocked();
  }

  async function handleUnblock() {
    if (!activeUser) return;
    await unblockUser(activeUser.id);
    onUserUnblocked();
  }

  async function saveProfile(payload: { nickname: string; status: string; avatar: File | null }) {
    if (!token || !authUser) return;
    const { user } = await updateProfileRequest(payload);
    setSession(token, user);
    void refreshContacts();
  }

  function openProfilePanel() {
    setProfileNickname(authUser?.nickname || "");
    setProfileStatus(authUser?.status || "Disponible");
    setProfileAvatar(null);
    setLeftPanelMode("profile");
  }

  function openContactsPanel() {
    setDirectorySearch("");
    setLeftPanelMode("contacts");
  }

  async function submitProfilePanel() {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      await saveProfile({
        nickname: profileNickname,
        status: profileStatus,
        avatar: profileAvatar,
      });
      setLeftPanelMode("chats");
    } finally {
      setSavingProfile(false);
    }
  }

  const activeHeaderName = activeUser ? sidebarTitle(activeUser) : "Selecciona una conversación";
  const activeUserOnline = activeUser ? isOnline(activeUser.id) : false;
  const headerStatus = typingUserId
    ? "Escribiendo…"
    : activeUserOnline
      ? "En línea"
      : activeUser?.status || "Sin estado";
  const hasActiveConversation = Boolean(activeConversationId);

  return (
    <RequireAuth>
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col bg-[#0B0B0F] text-zinc-100">
        <div className="grid shrink-0 grid-cols-1 border-b border-white/10 md:grid-cols-[380px_minmax(0,1fr)]">
          <TalkAppBrand onClick={() => setLeftPanelMode("chats")} />
          {hasActiveConversation ? (
            <div
              className={cn(
                "flex items-center gap-3 border-t border-white/10 bg-[#121217] px-3 sm:px-4 md:border-t-0 md:border-l md:border-white/10",
                HEADER_H
              )}
            >
              {activeUser ? (
                <>
                  <Avatar user={activeUser} showOnline isOnline={activeUserOnline} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold text-zinc-100">{activeHeaderName}</h2>
                      {conversationMuted ? (
                        <BellOff className="size-3.5 shrink-0 text-zinc-500" aria-label="Silenciado" />
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "truncate text-xs",
                        typingUserId ? "text-violet-300" : "text-zinc-500"
                      )}
                    >
                      {headerStatus}
                    </p>
                  </div>
                  <ConversationHeaderMenu
                    muted={conversationMuted}
                    blockedByMe={blockedByMe}
                    blockedMe={blockedMe}
                    onMute={() => void handleMute()}
                    onUnmute={() => void handleUnmute()}
                    onBlock={() => void handleBlock()}
                    onUnblock={() => void handleUnblock()}
                  />
                </>
              ) : null}
            </div>
          ) : (
            <div className="hidden md:block md:border-l md:border-white/10" />
          )}
        </div>

        {socketError ? (
          <p className="shrink-0 bg-rose-950/80 px-4 py-1.5 text-center text-xs text-rose-200">
            {socketError}
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => setSocketError(null)}
            >
              Cerrar
            </button>
          </p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <aside
            className={cn(
              "flex min-h-0 w-full shrink-0 flex-col border-white/10 bg-[#121217] md:w-[380px] md:border-r",
              leftPanelMode !== "chats"
                ? "max-md:flex-1 max-md:border-b"
                : "max-md:h-[min(36vh,260px)] max-md:border-b"
            )}
          >
            {leftPanelMode === "profile" ? (
              <ProfileEditorPanel
                currentUser={authUser}
                selectedAvatar={profileAvatar}
                nickname={profileNickname}
                status={profileStatus}
                saving={savingProfile}
                onNicknameChange={setProfileNickname}
                onStatusChange={setProfileStatus}
                onAvatarChange={setProfileAvatar}
                onSave={() => void submitProfilePanel()}
                onClose={() => setLeftPanelMode("chats")}
              />
            ) : leftPanelMode === "contacts" ? (
              <ContactsDirectoryPanel
                users={directoryUsers}
                searchTerm={directorySearch}
                onSearchTermChange={setDirectorySearch}
                onOpenConversation={(user) => void openConversationWithUser(user)}
                isOnline={isOnline}
              />
            ) : (
              <>
                <div className="shrink-0 border-b border-white/10 px-4 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Conversaciones
                  </p>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0B0B0F] px-2">
                    <Search className="size-4 text-zinc-500" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar en tus chats"
                      className="h-9 w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                    {chatSearchTerm ? (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="text-zinc-500 hover:text-zinc-200"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="list">
                  {visibleList.map((user) => {
                    const contact = contacts.find((item) => item.user.id === user.id);
                    const isActive =
                      !!contact &&
                      !!activeConversationId &&
                      contact.conversationId === activeConversationId;
                    const preview = lastMessagePreviewText(contact?.lastMessage);
                    const time = contact?.lastMessage?.createdAt
                      ? chatListTimestampLabel(contact.lastMessage.createdAt)
                      : "";
                    const userOnline = isOnline(user.id);
                    const lastMsg = contact?.lastMessage;
                    const showChecks =
                      lastMsg &&
                      lastMsg.senderId === authUser?.id &&
                      !lastMsg.deletedForEveryone;
                    const unread = contact?.unreadCount ?? 0;
                    const hasUnread = unread > 0 && !isActive;
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => void openConversationWithUser(user)}
                          className={cn(
                            "flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors sm:px-4",
                            isActive
                              ? "bg-violet-950/50"
                              : hasUnread
                                ? "bg-white/[0.02] hover:bg-white/[0.06]"
                                : "hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="shrink-0" aria-hidden>
                            <Avatar
                              user={user}
                              className="size-11"
                              fallbackClassName={cn(
                                "size-11",
                                isActive ? "bg-violet-600" : "bg-zinc-600"
                              )}
                              showOnline
                              isOnline={userOnline}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className={cn(
                                  "truncate",
                                  isActive
                                    ? "font-medium text-violet-200"
                                    : hasUnread
                                      ? "font-semibold text-zinc-50"
                                      : "font-medium text-zinc-100"
                                )}
                              >
                                {sidebarTitle(user)}
                              </span>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {contact?.muted ? (
                                  <BellOff className="size-3 text-zinc-600" />
                                ) : null}
                                {hasUnread ? <UnreadBadge count={unread} /> : null}
                                <span
                                  className={cn(
                                    "text-[11px]",
                                    hasUnread ? "font-medium text-emerald-400/90" : "text-zinc-500"
                                  )}
                                >
                                  {time}
                                </span>
                              </span>
                            </div>
                            <p
                              className={cn(
                                "flex items-center gap-1 truncate text-sm",
                                hasUnread ? "font-medium text-zinc-300" : "text-zinc-500"
                              )}
                            >
                              {showChecks && lastMsg ? (
                                <MessageStatusChecks
                                  message={lastMsg}
                                  currentUserId={authUser?.id}
                                  otherUserId={user.id}
                                />
                              ) : null}
                              <span className="truncate">{preview}</span>
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0B0B0F]">
            {hasActiveConversation ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#0c0c10] p-3 sm:p-4">
                {chatBlocked ? (
                  <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                    {blockedMe
                      ? "Este usuario te bloqueó. No puedes enviar mensajes."
                      : "Has bloqueado a este usuario. Desbloquéalo para volver a escribir."}
                  </p>
                ) : null}
                <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
                  {loadingMessages ? (
                    <p className="text-sm text-zinc-500">Cargando mensajes...</p>
                  ) : null}
                  {!loadingMessages && messages.length === 0 ? (
                    <p className="text-sm text-zinc-500">Aun no hay mensajes en esta conversación.</p>
                  ) : null}
                  {messages.map((message) => (
                    <ChatMessageBubble
                      key={message.id}
                      message={message}
                      mine={message.senderId === authUser?.id}
                      currentUserId={authUser?.id}
                      otherUserId={activeUser?.id}
                      onDeleteForEveryone={
                        message.senderId === authUser?.id && !message.deletedForEveryone
                          ? (id) => void handleDeleteForEveryone(id)
                          : undefined
                      }
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.12),_rgba(12,12,16,0.95)_50%)] px-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">
                  <MessageCircle className="size-8 text-violet-300" strokeWidth={1.6} />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-zinc-100">TalkApp</p>
                  <p className="max-w-sm text-sm text-zinc-400">
                    Selecciona una conversación para empezar a chatear y ver tus mensajes en tiempo real.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="flex shrink-0 flex-col border-t border-white/10 bg-[#0f0f14] md:flex-row md:items-center">
          <div className="flex w-full shrink-0 md:w-[380px] md:max-w-[380px]">
            {leftPanelMode === "chats" ? (
              <ChatUserStrip onOpenProfile={openProfilePanel} onOpenContacts={openContactsPanel} />
            ) : null}
          </div>
          {hasActiveConversation ? (
            <div className="flex min-h-0 min-w-0 flex-1 border-t border-white/10 md:border-t-0 md:border-l md:border-white/10">
              <MessageComposer
                disabled={!activeConversationId || chatBlocked}
                onSend={sendMessage}
                onTypingChange={handleTypingChange}
              />
            </div>
          ) : (
            <div className="hidden md:block md:min-h-0 md:min-w-0 md:flex-1 md:border-l md:border-white/10" />
          )}
        </footer>
      </div>
    </RequireAuth>
  );
}
