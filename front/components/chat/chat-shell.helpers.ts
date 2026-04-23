import type { ChatUser } from "@/types/chat";

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
