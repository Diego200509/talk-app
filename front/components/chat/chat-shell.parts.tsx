"use client";

import { useEffect, useMemo, useState } from "react";
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
  UserPen,
  Users,
  X,
} from "lucide-react";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { getMessageStatus } from "@/lib/chat/message-status";
import type { ChatMessage } from "@/types/chat";
import { useRouter } from "next/navigation";
import { logoutRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { ChatUser } from "@/types/chat";
import { SidebarPanelHeader } from "@/components/ui/sidebar-panel-header";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { resolveMediaUrl } from "@/lib/media-url";
import { HEADER_H, STATUS_OPTIONS, TALK_BTN_FILE, TALK_BTN_SECONDARY, TALK_FIELD_LABEL, TALK_INPUT, TALK_MENU_ICON, TALK_MENU_ITEM, TALK_MENU_ITEM_DANGER, TALK_MENU_PANEL, TALK_PROFILE_CARD, TALK_SEARCH_BOX, TALK_SIDEBAR_PANEL, avatarFallback, sidebarTitle } from "./chat-shell.helpers";

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
  const avatarSrc = user?.avatarUrl ? resolveMediaUrl(user.avatarUrl) : "";
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarSrc]);

  const showImage = Boolean(avatarSrc) && !imageFailed;

  const inner = showImage ? (
    <img
      src={avatarSrc}
      alt=""
      className={cn("size-10 rounded-full object-cover", className)}
      onError={() => setImageFailed(true)}
    />
  ) : (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white",
        className,
        fallbackClassName
      )}
      aria-label={`Avatar de ${name}`}
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
          "absolute bottom-0 right-0 size-3 rounded-full border-2 border-[var(--talk-panel-bg)]",
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

export function BlockedUnblockBar({ onUnblock }: { onUnblock: () => void }) {
  return (
    <div className="flex min-h-[56px] w-full flex-1 flex-col items-center justify-center gap-3 border-t border-white/10 bg-[#14141c] px-4 py-4 md:min-h-[60px]">
      <p className="text-center text-sm text-zinc-400">
        Desbloquea a este usuario para enviarle mensajes.
      </p>
      <button
        type="button"
        onClick={onUnblock}
        className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
      >
        Desbloquear
      </button>
    </div>
  );
}

export function ConversationHeaderMenu({
  muted,
  blockedByMe,
  allowBlock = true,
  onMute,
  onUnmute,
  onBlock,
  onUnblock,
}: {
  muted: boolean;
  blockedByMe: boolean;
  allowBlock?: boolean;
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
        className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--talk-border)] text-[var(--talk-muted)] hover:bg-[var(--talk-hover)] hover:text-[var(--talk-text)]"
        aria-label="Opciones de conversación"
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div className={cn("absolute right-0 top-full z-20 mt-1 w-52", TALK_MENU_PANEL)}>
          {muted ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onUnmute();
              }}
              className={TALK_MENU_ITEM}
            >
              <Bell className={TALK_MENU_ICON} />
              Activar notificaciones
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onMute();
              }}
              className={TALK_MENU_ITEM}
            >
              <BellOff className={TALK_MENU_ICON} />
              Silenciar chat
            </button>
          )}
          {allowBlock ? (
            blockedByMe ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onUnblock();
                }}
                className={TALK_MENU_ITEM}
              >
                <Ban className={TALK_MENU_ICON} />
                Desbloquear usuario
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onBlock();
                }}
                className={TALK_MENU_ITEM_DANGER}
              >
                <Ban className="size-4 shrink-0" />
                Bloquear usuario
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ChatUserStrip({
  onOpenProfile,
  onOpenContacts,
  onOpenCreateGroup,
}: {
  onOpenProfile: () => void;
  onOpenContacts: () => void;
  onOpenCreateGroup?: () => void;
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
    <div className="relative flex w-full flex-col gap-2 border-b border-[var(--talk-border)] bg-[var(--talk-strip-bg)] px-3 py-2.5">
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
          <p className="truncate text-sm font-medium leading-tight text-[var(--talk-text)]">{displayName}</p>
          <p className="truncate text-xs text-[var(--talk-muted)]">{user?.status || "Disponible"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggleButton />
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--talk-border)] bg-[var(--talk-hover)] text-[var(--talk-text)] transition-colors hover:border-violet-500/45 hover:bg-violet-500/15 hover:text-violet-600 dark:hover:text-white"
            aria-label="Abrir menu de usuario"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className={cn("absolute bottom-14 right-3 z-20 w-48", TALK_MENU_PANEL)}>
          <button
            type="button"
            onClick={() => {
              onOpenContacts();
              setMenuOpen(false);
            }}
            className={TALK_MENU_ITEM}
          >
            <Users className={TALK_MENU_ICON} />
            Contactos
          </button>
          {onOpenCreateGroup ? (
            <button
              type="button"
              onClick={() => {
                onOpenCreateGroup();
                setMenuOpen(false);
              }}
              className={TALK_MENU_ITEM}
            >
              <Users className="size-4 shrink-0 text-violet-500 dark:text-violet-400" />
              Nuevo grupo
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onOpenProfile();
              setMenuOpen(false);
            }}
            className={TALK_MENU_ITEM}
          >
            <UserPen className={TALK_MENU_ICON} />
            Perfil
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setConfirmLogoutOpen(true);
            }}
            className={TALK_MENU_ITEM_DANGER}
          >
            <LogOut className="size-4 shrink-0" />
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
    <div className={TALK_SIDEBAR_PANEL}>
      <SidebarPanelHeader title="Contactos" />
      <div className="shrink-0 border-b border-[var(--talk-border)] px-4 py-2">
        <div className={TALK_SEARCH_BOX}>
          <Search className="size-4 text-[var(--talk-muted)]" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Buscar en todos los usuarios"
            className="h-9 w-full bg-transparent text-sm text-[var(--talk-text)] outline-none placeholder:text-[var(--talk-muted)]"
          />
          {searchTerm.trim() ? (
            <button
              type="button"
              onClick={() => onSearchTermChange("")}
              className="text-[var(--talk-muted)] hover:text-[var(--talk-text)]"
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
              className="flex w-full gap-3 border-b border-[var(--talk-border)] px-3 py-3 text-left transition-colors hover:bg-[var(--talk-hover)] sm:px-4"
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
                <p className="truncate font-medium text-[var(--talk-text)]">{sidebarTitle(user)}</p>
                <p className="truncate text-xs text-[var(--talk-muted)]">
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
    <div className={TALK_SIDEBAR_PANEL}>
      <SidebarPanelHeader title="Perfil" />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className={TALK_PROFILE_CARD}>
          <Avatar
            user={profileUser}
            className="size-20"
            fallbackClassName="size-20 text-xl font-bold"
          />
          <p className="text-base font-semibold text-[var(--talk-text)]">
            {profileUser ? sidebarTitle(profileUser) : "Usuario"}
          </p>
          <p className="text-xs text-[var(--talk-muted)]">{profileUser?.status || "Disponible"}</p>
        </div>
        <p className={TALK_FIELD_LABEL}>Tus datos</p>
        <input
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          placeholder="Nickname"
          className={TALK_INPUT}
        />
        <select value={status} onChange={(e) => onStatusChange(e.target.value)} className={TALK_INPUT}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <label className={TALK_BTN_FILE}>
          Seleccionar avatar
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="mt-auto flex items-center justify-end gap-2 pt-3">
          <button type="button" onClick={onClose} className={TALK_BTN_SECONDARY}>
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

export function TalkAppBrand({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b border-[var(--talk-border)] bg-[var(--talk-sidebar-bg)] px-3 py-2.5 text-left sm:px-4",
        onClick ? "cursor-pointer hover:bg-[var(--talk-hover)]" : "cursor-default",
        HEADER_H
      )}
    >
      <div className="min-w-0 leading-tight">
        <h1 className="truncate bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-[2rem] dark:from-violet-300 dark:to-fuchsia-300">
          TalkApp
        </h1>
      </div>
    </button>
  );
}
