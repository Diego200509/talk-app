import { apiClient } from "@/lib/api/client";
import type { ChatMessage } from "@/types/chat";

export async function deleteMessageForEveryoneRequest(messageId: string): Promise<ChatMessage> {
  const { data } = await apiClient.delete<{ message: ChatMessage }>(`/messages/${messageId}`, {
    data: { scope: "for_everyone" },
  });
  return data.message;
}
