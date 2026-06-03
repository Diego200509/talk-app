"use client";

import { useEffect, useState } from "react";
import { Crown, LogOut, UserMinus, UserPlus, X } from "lucide-react";
import {
  addGroupMembersRequest,
  getGroupRequest,
  leaveGroupRequest,
  makeGroupAdminRequest,
  removeGroupAdminRequest,
  removeGroupMemberRequest,
  updateGroupRequest,
} from "@/lib/api/conversations";
import {
  TALK_INPUT,
  TALK_PANEL_HEADER_ROW,
  TALK_PANEL_TITLE,
  TALK_SIDEBAR_PANEL,
  sidebarTitle,
} from "@/components/chat/chat-shell.helpers";
import { Avatar } from "@/components/chat/chat-shell.parts";
import { cn } from "@/lib/utils";
import type { ChatUser, GroupConversation } from "@/types/chat";

export function ManageGroupPanel({
  conversationId,
  currentUserId,
  directoryUsers,
  onClose,
  onLeft,
  onUpdated,
}: {
  conversationId: string;
  currentUserId: string;
  directoryUsers: ChatUser[];
  onClose: () => void;
  onLeft: () => void;
  onUpdated: (group: GroupConversation) => void;
}) {
  const [group, setGroup] = useState<GroupConversation | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getGroupRequest(conversationId);
        if (!cancelled) {
          setGroup(data);
          setName(data.name);
        }
      } catch {
        if (!cancelled) setError("No se pudo cargar el grupo");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const isAdmin = group?.isAdmin ?? false;
  const nonMembers = directoryUsers.filter(
    (u) => !group?.participants.some((p) => p.id === u.id)
  );

  async function saveName() {
    if (!group || !isAdmin) return;
    const updated = await updateGroupRequest(conversationId, { name: name.trim() });
    setGroup(updated);
    onUpdated(updated);
  }

  async function addMember(userId: string) {
    if (!isAdmin) return;
    const result = await addGroupMembersRequest(conversationId, [userId]);
    setGroup(result.conversation);
    onUpdated(result.conversation);
  }

  async function removeMember(userId: string) {
    if (!isAdmin) return;
    const result = await removeGroupMemberRequest(conversationId, userId);
    setGroup(result.conversation);
    onUpdated(result.conversation);
  }

  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    if (!isAdmin || !group) return;
    const updated = makeAdmin
      ? await makeGroupAdminRequest(conversationId, userId)
      : await removeGroupAdminRequest(conversationId, userId);
    setGroup(updated);
    onUpdated(updated);
  }

  async function leave() {
    await leaveGroupRequest(conversationId);
    onLeft();
  }

  if (loading) {
    return <p className="p-4 text-sm text-[var(--talk-muted)]">Cargando grupo…</p>;
  }

  if (!group) {
    return (
      <p className="p-4 text-sm text-rose-600 dark:text-rose-300">{error || "Grupo no encontrado"}</p>
    );
  }

  return (
    <div className={TALK_SIDEBAR_PANEL}>
      <div className={TALK_PANEL_HEADER_ROW}>
        <h2 className={TALK_PANEL_TITLE}>Información del grupo</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--talk-muted)] hover:text-[var(--talk-text)]"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="space-y-3 border-b border-[var(--talk-border)] p-4">
        {isAdmin ? (
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(TALK_INPUT, "rounded-lg px-3")}
            />
            <button
              type="button"
              onClick={() => void saveName()}
              className="rounded-lg bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-500"
            >
              Guardar
            </button>
          </div>
        ) : (
          <p className="text-lg font-semibold text-[var(--talk-text)]">{group.name}</p>
        )}
        <p className="text-xs text-[var(--talk-muted)]">
          {group.memberCount ?? group.participants.length} miembros
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {group.participants.map((member) => {
          const admin = group.adminIds.includes(member.id);
          const isMe = member.id === currentUserId;
          return (
            <li
              key={member.id}
              className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-[var(--talk-hover)]"
            >
              <Avatar user={member} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--talk-text)]">
                  {sidebarTitle(member)}
                  {isMe ? " (tú)" : ""}
                </p>
                {admin ? (
                  <p className="text-[10px] text-violet-600 dark:text-violet-300">Administrador</p>
                ) : null}
              </div>
              {isAdmin && !isMe ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    title={admin ? "Quitar admin" : "Hacer admin"}
                    onClick={() => void toggleAdmin(member.id, !admin)}
                    className="rounded p-1.5 text-[var(--talk-muted)] hover:bg-[var(--talk-hover)] hover:text-violet-600 dark:hover:text-violet-200"
                  >
                    <Crown className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar del grupo"
                    onClick={() => void removeMember(member.id)}
                    className="rounded p-1.5 text-[var(--talk-muted)] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300"
                  >
                    <UserMinus className="size-4" />
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {isAdmin && nonMembers.length > 0 ? (
        <div className="border-t border-[var(--talk-border)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--talk-muted)]">Agregar miembros</p>
          <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
            {nonMembers.slice(0, 20).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => void addMember(u.id)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--talk-text)] hover:bg-[var(--talk-hover)]"
              >
                <UserPlus className="size-3.5 text-violet-600 dark:text-violet-300" />
                {sidebarTitle(u)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="border-t border-[var(--talk-border)] p-4">
        <button
          type="button"
          onClick={() => void leave()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 py-2.5 text-sm text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
        >
          <LogOut className="size-4" />
          Salir del grupo
        </button>
      </div>
    </div>
  );
}
