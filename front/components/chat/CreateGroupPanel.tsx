"use client";

import { useState } from "react";
import { Check, Users, X } from "lucide-react";
import { createGroupRequest } from "@/lib/api/conversations";
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

export function CreateGroupPanel({
  users,
  onCreated,
  onClose,
}: {
  users: ChatUser[];
  onCreated: (group: GroupConversation) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleUser(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    const cleanName = name.trim();
    if (!cleanName || selected.size < 1) {
      setError("Nombre y al menos un contacto son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const group = await createGroupRequest({
        name: cleanName,
        description: description.trim() || undefined,
        memberIds: [...selected],
      });
      onCreated(group);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el grupo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={TALK_SIDEBAR_PANEL}>
      <div className={TALK_PANEL_HEADER_ROW}>
        <h2 className={TALK_PANEL_TITLE}>Nuevo grupo</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--talk-muted)] hover:text-[var(--talk-text)]"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="space-y-3 border-b border-[var(--talk-border)] p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del grupo"
          className={cn(TALK_INPUT, "rounded-lg px-3")}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          className={cn(TALK_INPUT, "rounded-lg px-3")}
        />
        <p className="text-xs text-[var(--talk-muted)]">
          <Users className="mr-1 inline size-3.5" />
          {selected.size} contacto(s) seleccionado(s)
        </p>
        {error ? <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {users.map((user) => {
          const picked = selected.has(user.id);
          return (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => toggleUser(user.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--talk-hover)]",
                  picked && "bg-violet-500/10"
                )}
              >
                <Avatar user={user} className="size-10" />
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--talk-text)]">
                  {sidebarTitle(user)}
                </span>
                {picked ? <Check className="size-4 text-violet-600 dark:text-violet-300" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-[var(--talk-border)] p-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? "Creando…" : "Crear grupo"}
        </button>
      </div>
    </div>
  );
}
