import { apiClient } from "@/lib/api/client";
import type { ChatMessage, Conversation, GroupConversation } from "@/types/chat";

export async function getOrCreateDirectConversationRequest(
  targetUserId: string
): Promise<Conversation> {
  const { data } = await apiClient.post<{ conversation: Conversation }>("/conversations/direct", {
    targetUserId,
  });
  return data.conversation;
}

export async function createGroupRequest(payload: {
  name: string;
  description?: string;
  memberIds: string[];
  avatarUrl?: string;
}): Promise<GroupConversation> {
  const { data } = await apiClient.post<{ conversation: GroupConversation }>(
    "/conversations/group",
    payload
  );
  return data.conversation;
}

export async function getGroupRequest(conversationId: string): Promise<GroupConversation> {
  const { data } = await apiClient.get<{ conversation: GroupConversation }>(
    `/conversations/${conversationId}`
  );
  return data.conversation;
}

export async function updateGroupRequest(
  conversationId: string,
  payload: { name?: string; description?: string; avatarUrl?: string | null }
): Promise<GroupConversation> {
  const { data } = await apiClient.patch<{ conversation: GroupConversation }>(
    `/conversations/${conversationId}/group`,
    payload
  );
  return data.conversation;
}

export async function addGroupMembersRequest(
  conversationId: string,
  memberIds: string[]
): Promise<{ conversation: GroupConversation; addedUserIds: string[] }> {
  const { data } = await apiClient.post<{
    conversation: GroupConversation;
    addedUserIds: string[];
  }>(`/conversations/${conversationId}/members`, { memberIds });
  return data;
}

export async function removeGroupMemberRequest(
  conversationId: string,
  userId: string
): Promise<{ conversation: GroupConversation; removedUserId: string }> {
  const { data } = await apiClient.delete<{
    conversation: GroupConversation;
    removedUserId: string;
  }>(`/conversations/${conversationId}/members/${userId}`);
  return data;
}

export async function leaveGroupRequest(conversationId: string) {
  const { data } = await apiClient.post(`/conversations/${conversationId}/leave`);
  return data;
}

export async function makeGroupAdminRequest(conversationId: string, userId: string) {
  const { data } = await apiClient.post<{ conversation: GroupConversation }>(
    `/conversations/${conversationId}/admins/${userId}`
  );
  return data.conversation;
}

export async function removeGroupAdminRequest(conversationId: string, userId: string) {
  const { data } = await apiClient.delete<{ conversation: GroupConversation }>(
    `/conversations/${conversationId}/admins/${userId}`
  );
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
  const { data } = await apiClient.post<{ muted: boolean }>(
    `/conversations/${conversationId}/unmute`
  );
  return data;
}
