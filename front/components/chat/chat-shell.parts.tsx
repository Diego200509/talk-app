"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  LogOut,
  Search,
  Settings,
  UserPen,
  Users,
  X,
} from "lucide-react";
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
}: {
  user: ChatUser | null | undefined;
  className?: string;
  fallbackClassName?: string;
}) {
  const name = user ? sidebarTitle(user) : "Usuario";
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`Avatar de ${name}`}
        className={cn("size-10 rounded-full object-cover", className)}
      />
    );
  }
  return (
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
}: {
  users: ChatUser[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onOpenConversation: (user: ChatUser) => void;
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
                <Avatar user={user} className="size-11" fallbackClassName="size-11 bg-zinc-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-100">{sidebarTitle(user)}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
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
}: {
  disabled: boolean;
  onSend: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const clean = value.trim();
    if (!clean || disabled) return;
    onSend(clean);
    setValue("");
  }

  return (
    <div className="flex min-h-[52px] w-full flex-1 items-end gap-2 bg-[#14141c] p-2 md:min-h-[56px] md:p-2.5">
      <div className="flex min-h-[44px] w-full flex-1 items-end gap-2 rounded-2xl border border-white/10 bg-[#0B0B0F] px-3 py-1.5 ring-violet-500/20 focus-within:border-violet-500/40 focus-within:ring-1">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Escribe un mensaje…"
          className="max-h-32 min-h-[36px] w-full resize-none bg-transparent py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
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
