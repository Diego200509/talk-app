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

export type LeftPanelMode = "chats" | "profile" | "contacts";

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
