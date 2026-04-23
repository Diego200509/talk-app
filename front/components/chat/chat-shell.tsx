"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Search, X } from "lucide-react";
import {
  getContactsRequest,
  getDirectoryUsersRequest,
  updateProfileRequest,
} from "@/lib/api/users";
import { getOrCreateDirectConversationRequest, getConversationMessagesRequest } from "@/lib/api/conversations";
import { RequireAuth } from "@/components/chat/require-auth";
import { useAuthStore } from "@/stores/auth-store";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatUser, ContactItem } from "@/types/chat";
import {
  LeftPanelMode,
  HEADER_H,
  chatListTimestampLabel,
  messageTimestampLabel,
  sidebarTitle,
} from "./chat-shell.helpers";
import {
  Avatar,
  ChatUserStrip,
  ContactsDirectoryPanel,
  MessageComposer,
  ProfileEditorPanel,
  TalkAppBrand,
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    const list = await getContactsRequest();
    setContacts(list);
    if (!activeConversationId) return;
    const current = list.find((item) => item.conversationId === activeConversationId);
    if (current?.user) {
      setActiveUser(current.user);
    }
  }, [activeConversationId]);

  useEffect(() => {
    const task = setTimeout(() => {
      void refreshContacts();
    }, 0);
    return () => clearTimeout(task);
  }, [refreshContacts]);

  useEffect(() => {
    if (leftPanelMode !== "contacts") return;
    const timeout = setTimeout(async () => {
      const users = await getDirectoryUsersRequest(directorySearch.trim() || undefined);
      setDirectoryUsers(users);
    }, 250);
    return () => clearTimeout(timeout);
  }, [leftPanelMode, directorySearch]);

  const onMessage = useCallback(
    (message: ChatMessage) => {
      if (message.conversationId === activeConversationId) {
        setMessages((prev) => [...prev, message]);
      }
    },
    [activeConversationId]
  );

  const onConversationUpdated = useCallback(
    (payload: { conversationId: string; message: ChatMessage }) => {
      setContacts((prev) => {
        const idx = prev.findIndex((item) => item.conversationId === payload.conversationId);
        if (idx === -1) {
          void refreshContacts();
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...next[idx], lastMessage: payload.message };
        next.sort((a, b) => {
          const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bt - at;
        });
        return next;
      });
    },
    [refreshContacts]
  );

  const onContactsRefresh = useCallback(() => {
    void refreshContacts();
    if (leftPanelMode === "contacts") {
      void getDirectoryUsersRequest(directorySearch.trim() || undefined).then(setDirectoryUsers);
    }
  }, [refreshContacts, leftPanelMode, directorySearch]);

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

  useChatSocket({
    token,
    onMessage,
    onConversationUpdated,
    onContactsRefresh,
    onUserUpdated,
  });

  useEffect(() => {
    if (!token || !activeConversationId) return;
    const socket = getSocket(token);
    socket.emit("conversation:join", { conversationId: activeConversationId });
  }, [token, activeConversationId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (!activeConversationId) return;
      setActiveConversationId(null);
      setActiveUser(null);
      setMessages([]);
      setLoadingMessages(false);
      setLeftPanelMode("chats");
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
    // Seleccion optimista para que el header cambie al primer clic.
    setActiveUser(user);
    setLeftPanelMode("chats");
    const conversation = await getOrCreateDirectConversationRequest(user.id);
    setActiveConversationId(conversation.id);
    setLoadingMessages(true);
    try {
      const list = await getConversationMessagesRequest(conversation.id);
      setMessages(list);
    } finally {
      setLoadingMessages(false);
    }
    void refreshContacts();
  }

  async function sendMessage(content: string) {
    if (!token || !activeConversationId) return;
    const socket = getSocket(token);
    socket.emit("message:send", { conversationId: activeConversationId, content });
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
  const activeHeaderStatus = activeUser?.status || "Sin estado";
  const hasActiveConversation = Boolean(activeConversationId);

  return (
    <RequireAuth>
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col bg-[#0B0B0F] text-zinc-100">
        {/* Fila superior: logo (columna bandeja) + cabecera del chat al mismo nivel — sin buscador */}
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
                  <Avatar user={activeUser} />
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-zinc-100">{activeHeaderName}</h2>
                    <p className="truncate text-xs text-zinc-500">{activeHeaderStatus}</p>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="hidden md:block md:border-l md:border-white/10" />
          )}
        </div>

        {/* Cuerpo: bandeja | mensajes */}
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
                    const preview = contact?.lastMessage?.content || "Sin mensajes todavía";
                    const time = contact?.lastMessage?.createdAt
                      ? chatListTimestampLabel(contact.lastMessage.createdAt)
                      : "";
                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => void openConversationWithUser(user)}
                          className={cn(
                            "flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors sm:px-4",
                            isActive ? "bg-violet-950/50" : "hover:bg-white/[0.04]"
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
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className={cn(
                                  "truncate font-medium",
                                  isActive ? "text-violet-200" : "text-zinc-100"
                                )}
                              >
                                {sidebarTitle(user)}
                              </span>
                              <span className="shrink-0 text-[11px] text-zinc-500">{time}</span>
                            </div>
                            <p className="truncate text-sm text-zinc-500">{preview}</p>
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
                <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
                  {loadingMessages ? (
                    <p className="text-sm text-zinc-500">Cargando mensajes...</p>
                  ) : null}
                  {!loadingMessages && messages.length === 0 ? (
                    <p className="text-sm text-zinc-500">Aun no hay mensajes en esta conversación.</p>
                  ) : null}
                  {messages.map((message) => {
                    const mine = message.senderId === authUser?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "max-w-[88%] overflow-hidden rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                          mine
                            ? "self-end rounded-tr-md border border-violet-400/40 bg-violet-700 text-white"
                            : "self-start rounded-tl-md border border-white/10 bg-[#1a1a22] text-zinc-100"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {message.content}
                        </p>
                        <p className={cn("mt-1 text-[10px]", mine ? "text-violet-100/90" : "opacity-70")}>
                          {messageTimestampLabel(message.createdAt)}
                        </p>
                      </div>
                    );
                  })}
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
              <MessageComposer disabled={!activeConversationId} onSend={sendMessage} />
            </div>
          ) : (
            <div className="hidden md:block md:min-h-0 md:min-w-0 md:flex-1 md:border-l md:border-white/10" />
          )}
        </footer>
      </div>
    </RequireAuth>
  );
}
