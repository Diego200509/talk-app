import type { ChatMessage } from "@/types/chat";

export type MessageStatus = "sent" | "delivered" | "read";

function normIds(arr?: string[]) {
  return (arr || []).map((id) => String(id));
}

export function getMessageStatus(
  message: ChatMessage,
  currentUserId: string | undefined,
  otherUserId?: string | undefined
): MessageStatus | null {
  if (!currentUserId || String(message.senderId) !== String(currentUserId)) return null;
  if (message.deletedForEveryone) return null;
  if (message.type === "system") return null;

  const readBy = normIds(message.readBy);
  const deliveredBy = normIds(message.deliveredBy);
  const peerId = otherUserId ? String(otherUserId) : null;

  const blockedFor = normIds(message.blockedFor);
  if (peerId && blockedFor.includes(peerId)) {
    return "sent";
  }

  if (peerId) {
    if (readBy.includes(peerId)) return "read";
    if (deliveredBy.includes(peerId)) return "delivered";
    return "sent";
  }

  if (readBy.length > 0) return "read";
  if (deliveredBy.length > 0) return "delivered";
  return "sent";
}

export function mergeMessageReceipt(existing: ChatMessage, incoming: ChatMessage): ChatMessage {
  const deliveredBy = new Set([...(existing.deliveredBy || []), ...(incoming.deliveredBy || [])]);
  const readBy = new Set([...(existing.readBy || []), ...(incoming.readBy || [])]);
  return {
    ...existing,
    ...incoming,
    deliveredBy: [...deliveredBy],
    readBy: [...readBy],
  };
}

export function lastMessagePreviewText(message: ChatMessage | null | undefined): string {
  if (!message) return "Sin mensajes todavía";
  if (message.deletedForEveryone) return "Este mensaje fue eliminado";

  const type = message.type || "text";
  if (type === "image") {
    return message.content?.trim() ? `${message.content.trim()}` : "Imagen";
  }
  if (type === "document") {
    return `${message.fileName || message.content || "Documento PDF"}`;
  }
  if (type === "voice") {
    return message.fileName || message.content || "Nota de voz";
  }
  if (type === "system") {
    return message.systemText || "Actividad del grupo";
  }
  if (type === "linkPreview") {
    return message.linkPreview?.title || message.content || "Enlace";
  }
  return message.content || "Sin mensajes todavía";
}
