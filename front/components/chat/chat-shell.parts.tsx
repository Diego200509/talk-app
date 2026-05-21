"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  LogOut,
  MoreVertical,
  Search,
  Settings,
  Trash2,
  UserPen,
  Users,
  X,
} from "lucide-react";
import { getMessageStatus } from "@/lib/chat/message-status";
import type { ChatMessage } from "@/types/chat";
import { useRouter } from "next/navigation";
import { logoutRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { ChatUser } from "@/types/chat";
import { SidebarPanelHeader } from "@/components/ui/sidebar-panel-header";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { HEADER_H, STATUS_OPTIONS, avatarFallback, sidebarTitle } from "./chat-shell.helpers";

export function Avatar({
  user,
  className,
  fallbackClassName,
  showOnline,
  isOnline,
}: {
  user: ChatUser | null | undefined;
  className?: string;
  fallbackClassName?: string;
  showOnline?: boolean;
  isOnline?: boolean;
}) {
  const name = user ? sidebarTitle(user) : "Usuario";
  const inner = user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={`Avatar de ${name}`}
      className={cn("size-10 rounded-full object-cover", className)}
    />
  ) : (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white",
        fallbackClassName
      )}
      aria-hidden
    >
      {avatarFallback(name)}
    </div>
  );

  if (!showOnline) return inner;

  return (
    <div className="relative shrink-0">
      {inner}
      <span
        className={cn(
          "absolute bottom-0 right-0 size-3 rounded-full border-2 border-[#121217]",
          isOnline ? "bg-emerald-500" : "bg-zinc-500"
        )}
        aria-label={isOnline ? "En línea" : "Desconectado"}
      />
    </div>
  );
}

export function UnreadBadge({ count }: { count: number }) {
  const label = count > 99 ? "99+" : String(count);
  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {label}
    </span>
  );
}

export function MessageStatusChecks({
  message,
  currentUserId,
  otherUserId,
}: {
  message: ChatMessage;
  currentUserId: string | undefined;
  otherUserId?: string;
}) {
  const status = getMessageStatus(message, currentUserId, otherUserId);
  if (!status) return null;
  if (status === "read") {
    return <CheckCheck className="size-3.5 text-sky-300" aria-label="Leído" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="size-3.5 opacity-80" aria-label="Entregado" />;
  }
  return <Check className="size-3.5 opacity-80" aria-label="Enviado" />;
}

export function ChatMessageBubble({
  message,
  mine,
  currentUserId,
  otherUserId,
  onDeleteForEveryone,
}: {
  message: ChatMessage;
  mine: boolean;
  currentUserId: string | undefined;
  otherUserId?: string;
  onDeleteForEveryone?: (messageId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const deleted = Boolean(message.deletedForEveryone);

  return (
    <div
      className={cn(
        "group relative max-w-[88%]",
        mine ? "self-end" : "self-start"
      )}
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
          mine
            ? "rounded-tr-md border border-violet-400/40 bg-violet-700 text-white"
            : "rounded-tl-md border border-white/10 bg-[#1a1a22] text-zinc-100",
          deleted && "italic opacity-80"
        )}
      >
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {deleted ? "Este mensaje fue eliminado" : message.content}
        </p>
        <div className={cn("mt-1 flex items-center justify-end gap-1", mine ? "text-violet-100/90" : "opacity-70")}>
          <span className="text-[10px]">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {mine ? (
            <MessageStatusChecks
              message={message}
              currentUserId={currentUserId}
              otherUserId={otherUserId}
            />
          ) : null}
        </div>
      </div>
      {mine && !deleted && onDeleteForEveryone ? (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
            aria-label="Opciones del mensaje"
          >
            <MoreVertical className="size-4" />
          </button>
          {menuOpen ? (
            <div className="absolute left-0 top-full z-10 mt-1 w-44 rounded-lg border border-white/10 bg-[#1a1a24] p-1 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteForEveryone(message.id);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-rose-300 hover:bg-rose-500/10"
              >
                <Trash2 className="size-3.5" />
                Eliminar para todos
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ConversationHeaderMenu({
  muted,
  blockedByMe,
  blockedMe,
  onMute,
  onUnmute,
  onBlock,
  onUnblock,
}: {
  muted: boolean;
  blockedByMe: boolean;
  blockedMe: boolean;
  onMute: () => void;
  onUnmute: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative ml-auto shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
        aria-label="Opciones de conversación"
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-white/10 bg-[#1a1a24] p-1 shadow-xl">
          {muted ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onUnmute();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/[0.06]"
            >
              <Bell className="size-4 text-zinc-400" />
              Activar notificaciones
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onMute();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/[0.06]"
            >
              <BellOff className="size-4 text-zinc-400" />
              Silenciar chat
            </button>
          )}
          {blockedByMe ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onUnblock();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/[0.06]"
            >
              <Ban className="size-4 text-zinc-400" />
              Desbloquear usuario
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onBlock();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
            >
              <Ban className="size-4" />
              Bloquear usuario
            </button>
          )}
        </div>
      ) : null}
      {(blockedByMe || blockedMe) && (
        <p className="absolute -bottom-5 right-0 whitespace-nowrap text-[10px] text-amber-400/90">
          {blockedMe ? "Te bloqueó" : "Usuario bloqueado"}
        </p>
      )}
    </div>
  );
}

export function ChatUserStrip({
  onOpenProfile,
  onOpenContacts,
}: {
  onOpenProfile: () => void;
  onOpenContacts: () => void;
}) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  async function logout() {
    try {
      if (token) await logoutRequest();
    } catch {
      /* ignorar */
    }
    router.replace("/login");
    clearSession();
    router.refresh();
  }

  const displayName =
    user?.nickname?.trim() ||
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0]?.replace(/\./g, " ") : "") ||
    "Usuario";

  return (
    <div className="relative flex w-full flex-col gap-2 border-b border-white/10 bg-[#14141c] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Avatar
          user={
            user
              ? {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  nickname: user.nickname,
                  status: user.status,
                  avatarUrl: user.avatarUrl,
                }
              : null
          }
          className="size-9"
          fallbackClassName="size-9 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-bold"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight text-zinc-100">{displayName}</p>
          <p className="truncate text-xs text-zinc-500">{user?.status || "Disponible"}</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-zinc-200 transition-colors hover:border-violet-500/45 hover:bg-violet-500/15 hover:text-white"
          aria-label="Abrir menu de usuario"
        >
          <Settings className="size-4" />
        </button>
      </div>

      {menuOpen ? (
        <div className="absolute bottom-14 right-3 z-20 w-48 rounded-xl border border-white/10 bg-[#1a1a24] p-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onOpenContacts();
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-100 transition hover:bg-white/[0.06]"
          >
            <Users className="size-4 text-zinc-400" />
            Contactos
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenProfile();
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-100 transition hover:bg-white/[0.06]"
          >
            <UserPen className="size-4 text-zinc-400" />
            Perfil
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setConfirmLogoutOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
          >
            <LogOut className="size-4" />
            Cerrar sesion
          </button>
        </div>
      ) : null}
      <ConfirmModal
        open={confirmLogoutOpen}
        title="Cerrar sesion"
        description="Estas seguro de que deseas cerrar sesion?"
        confirmLabel="Si, cerrar sesion"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onCancel={() => setConfirmLogoutOpen(false)}
        onConfirm={() => {
          setConfirmLogoutOpen(false);
          void logout();
        }}
      />
    </div>
  );
}

export function ContactsDirectoryPanel({
  users,
  searchTerm,
  onSearchTermChange,
  onOpenConversation,
  isOnline,
}: {
  users: ChatUser[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onOpenConversation: (user: ChatUser) => void;
  isOnline?: (userId: string) => boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#121217]">
      <SidebarPanelHeader title="Contactos" />
      <div className="shrink-0 border-b border-white/10 px-4 py-2">
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0B0B0F] px-2">
          <Search className="size-4 text-zinc-500" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Buscar en todos los usuarios"
            className="h-9 w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          {searchTerm.trim() ? (
            <button
              type="button"
              onClick={() => onSearchTermChange("")}
              className="text-zinc-500 hover:text-zinc-200"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="list">
        {users.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => onOpenConversation(user)}
              className="flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors hover:bg-white/[0.04] sm:px-4"
            >
              <div className="shrink-0" aria-hidden>
                <Avatar
                  user={user}
                  className="size-11"
                  fallbackClassName="size-11 bg-zinc-600"
                  showOnline
                  isOnline={isOnline?.(user.id)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-100">{sidebarTitle(user)}</p>
                <p className="truncate text-xs text-zinc-500">
                  {isOnline?.(user.id) ? "En línea" : user.email}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProfileEditorPanel({
  currentUser,
  selectedAvatar,
  nickname,
  status,
  saving,
  onNicknameChange,
  onStatusChange,
  onAvatarChange,
  onSave,
  onClose,
}: {
  currentUser: ChatUser | null;
  selectedAvatar: File | null;
  nickname: string;
  status: string;
  saving: boolean;
  onNicknameChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onAvatarChange: (file: File | null) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const previewAvatarUrl = useMemo(
    () => (selectedAvatar ? URL.createObjectURL(selectedAvatar) : ""),
    [selectedAvatar]
  );

  useEffect(() => {
    return () => {
      if (previewAvatarUrl) URL.revokeObjectURL(previewAvatarUrl);
    };
  }, [previewAvatarUrl]);

  const profileUser = currentUser
    ? {
        ...currentUser,
        nickname: nickname.trim() || currentUser.nickname,
        status,
        avatarUrl: previewAvatarUrl || currentUser.avatarUrl,
      }
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#121217]">
      <SidebarPanelHeader title="Perfil" />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="mb-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#151520] py-4">
          <Avatar
            user={profileUser}
            className="size-20"
            fallbackClassName="size-20 text-xl font-bold"
          />
          <p className="text-base font-semibold text-zinc-100">
            {profileUser ? sidebarTitle(profileUser) : "Usuario"}
          </p>
          <p className="text-xs text-zinc-400">{profileUser?.status || "Disponible"}</p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Tus datos</p>
        <input
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          placeholder="Nickname"
          className="h-10 rounded-md border border-white/10 bg-[#101019] px-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500/60"
        />
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-10 rounded-md border border-white/10 bg-[#101019] px-2.5 text-sm text-zinc-100 outline-none focus:border-violet-500/60"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.06] px-2 text-sm text-zinc-300 hover:bg-white/[0.1]">
          Seleccionar avatar
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="mt-auto flex items-center justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-white/10 px-3 text-sm text-zinc-300 transition hover:bg-white/[0.08]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            <Check className="size-3.5" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function MessageComposer({
  disabled,
  onSend,
  onTypingChange,
}: {
  disabled: boolean;
  onSend: (value: string) => void;
  onTypingChange?: (typing: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notifyTyping(typing: boolean) {
    onTypingChange?.(typing);
  }

  function handleChange(next: string) {
    setValue(next);
    if (disabled) return;
    if (next.trim()) {
      notifyTyping(true);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => notifyTyping(false), 1500);
    } else {
      notifyTyping(false);
    }
  }

  function submit() {
    const clean = value.trim();
    if (!clean || disabled) return;
    notifyTyping(false);
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    onSend(clean);
    setValue("");
  }

  useEffect(() => {
    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-[52px] w-full flex-1 items-end gap-2 bg-[#14141c] p-2 md:min-h-[56px] md:p-2.5">
      <div className="flex min-h-[44px] w-full flex-1 items-end gap-2 rounded-2xl border border-white/10 bg-[#0B0B0F] px-3 py-1.5 ring-violet-500/20 focus-within:border-violet-500/40 focus-within:ring-1">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={disabled ? "No puedes enviar mensajes" : "Escribe un mensaje…"}
          disabled={disabled}
          className="max-h-32 min-h-[36px] w-full resize-none bg-transparent py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-50"
          aria-label="Mensaje"
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={submit}
          className="mb-0.5 shrink-0 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

export function TalkAppBrand({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b border-white/10 bg-[#121217] px-3 py-2.5 text-left sm:px-4",
        onClick ? "cursor-pointer hover:bg-white/[0.03]" : "cursor-default",
        HEADER_H
      )}
    >
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-[2rem]">TalkApp</h1>
      </div>
    </button>
  );
}
