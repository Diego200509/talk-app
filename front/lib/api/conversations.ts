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
