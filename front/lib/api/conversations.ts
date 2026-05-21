import { apiClient } from "@/lib/api/client";
import type { ChatMessage, Conversation } from "@/types/chat";

export async function getOrCreateDirectConversationRequest(
  targetUserId: string
): Promise<Conversation> {
  const { data } = await apiClient.post<{ conversation: Conversation }>("/conversations/direct", {
    targetUserId,
  });
  return data.conversation;
}

export async function getConversationMessagesRequest(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<{ messages: ChatMessage[] }>(
    `/conversations/${conversationId}/messages`
  );
  return data.messages;
}

export async function muteConversationRequest(conversationId: string): Promise<{ muted: boolean }> {
  const { data } = await apiClient.post<{ muted: boolean }>(`/conversations/${conversationId}/mute`);
  return data;
}

export async function unmuteConversationRequest(conversationId: string): Promise<{ muted: boolean }> {
  const { data } = await apiClient.post<{ muted: boolean }>(`/conversations/${conversationId}/unmute`);
  return data;
}
