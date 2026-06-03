import { mergeMessageReceipt } from "@/lib/chat/message-status";
import type { ChatMessage, ChatUser, ContactItem } from "@/types/chat";

export const HEADER_H = "min-h-[56px] md:min-h-[60px]";
export const STATUS_OPTIONS = [
  "Disponible",
  "Ocupado",
  "Ausente",
  "En reunion",
  "No molestar",
] as const;

export function avatarFallback(label: string) {
  return (label || "?").trim().charAt(0).toUpperCase() || "?";
}

export function timeLabel(dateLike: string) {
  const dt = new Date(dateLike);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDiff(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86400000);
}

export function chatListTimestampLabel(dateLike: string) {
  const dt = new Date(dateLike);
  if (Number.isNaN(dt.getTime())) return "";

  const now = new Date();
  const diff = dayDiff(dt, now);

  if (diff === 0) {
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff === 1) return "Ayer";
  if (diff > 1 && diff < 7) {
    return dt.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "");
  }
  return dt.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function messageTimestampLabel(dateLike: string) {
  const dt = new Date(dateLike);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function sidebarTitle(user: ChatUser) {
  return user.nickname || user.name || user.email;
}

export type LeftPanelMode = "chats" | "profile" | "contacts" | "create-group" | "manage-group";

export const TALK_MENU_PANEL =
  "rounded-xl border border-[var(--talk-border)] bg-[var(--talk-popover-bg)] p-1 shadow-[var(--talk-popover-shadow)]";

export const TALK_MENU_ITEM =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--talk-popover-text)] transition hover:bg-[var(--talk-popover-hover)]";

export const TALK_MENU_ITEM_DANGER =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300";

export const TALK_MENU_ICON = "size-4 shrink-0 text-[var(--talk-muted)]";

export const TALK_SIDEBAR_PANEL = "flex min-h-0 flex-1 flex-col bg-[var(--talk-sidebar-bg)]";

export const TALK_FIELD_LABEL =
  "text-xs font-semibold uppercase tracking-wide text-[var(--talk-muted)]";

export const TALK_INPUT =
  "h-10 w-full rounded-md border border-[var(--talk-border)] bg-[var(--talk-input-bg)] px-2.5 text-sm text-[var(--talk-text)] outline-none placeholder:text-[var(--talk-muted)] focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/25";

export const TALK_PROFILE_CARD =
  "mb-2 flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--talk-border)] bg-[var(--talk-profile-card-bg)] py-4 shadow-sm";

export const TALK_BTN_SECONDARY =
  "inline-flex h-9 items-center gap-1 rounded-md border border-[var(--talk-border)] bg-[var(--talk-hover)] px-3 text-sm text-[var(--talk-text)] transition hover:bg-violet-500/10";

export const TALK_BTN_FILE =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-[var(--talk-border)] bg-[var(--talk-hover)] px-2 text-sm text-[var(--talk-text)] transition hover:bg-violet-500/10";

export const TALK_PANEL_HEADER =
  "flex items-center gap-2 border-b border-[var(--talk-border)] px-4 py-3";

export const TALK_PANEL_HEADER_ROW =
  "flex items-center justify-between border-b border-[var(--talk-border)] px-4 py-3";

export const TALK_PANEL_TITLE = "text-sm font-semibold text-[var(--talk-text)]";

export const TALK_SEARCH_BOX =
  "mt-1 flex items-center gap-2 rounded-xl border border-[var(--talk-border)] bg-[var(--talk-search-bg)] px-2";

export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map(existing.map((m) => [m.id, m]));
  for (const msg of incoming) {
    const prev = map.get(msg.id);
    map.set(msg.id, prev ? mergeMessageReceipt(prev, msg) : msg);
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function upsertMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const idx = list.findIndex((m) => m.id === message.id);
  if (idx === -1) return mergeMessages(list, [message]);
  const next = [...list];
  next[idx] = mergeMessageReceipt(next[idx], message);
  return next;
}

export function isLatestMessage(contact: ContactItem | undefined, message: ChatMessage) {
  if (!contact?.lastMessage) return true;
  return (
    contact.lastMessage.id === message.id ||
    new Date(message.createdAt).getTime() >= new Date(contact.lastMessage.createdAt).getTime()
  );
}

export function patchContactWithMessage(
  contact: ContactItem,
  message: ChatMessage,
  unreadCount?: number
): ContactItem {
  const latest = isLatestMessage(contact, message);
  return {
    ...contact,
    lastMessage: latest ? mergeMessageReceipt(contact.lastMessage || message, message) : contact.lastMessage,
    unreadCount: unreadCount ?? contact.unreadCount,
  };
}

export function formatUnreadBadge(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}
