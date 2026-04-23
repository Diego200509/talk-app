import { apiClient } from "@/lib/api/client";
import type { ChatUser, ContactItem } from "@/types/chat";

export async function getMeRequest(): Promise<{ user: ChatUser }> {
  const { data } = await apiClient.get<{ user: ChatUser }>("/users/me");
  return data;
}

export async function updateProfileRequest(payload: {
  nickname?: string;
  status?: string;
  avatar?: File | null;
}): Promise<{ user: ChatUser }> {
  const formData = new FormData();
  if (typeof payload.nickname === "string" && payload.nickname.trim()) {
    formData.append("nickname", payload.nickname.trim());
  }
  if (typeof payload.status === "string") {
    formData.append("status", payload.status);
  }
  if (payload.avatar) {
    formData.append("avatar", payload.avatar);
  }
  const { data } = await apiClient.put<{ user: ChatUser }>("/users/profile", formData);
  return data;
}

export async function searchUsersRequest(query: string): Promise<ChatUser[]> {
  const { data } = await apiClient.get<{ users: ChatUser[] }>("/users/search", {
    params: { q: query },
  });
  return data.users;
}

export async function getContactsRequest(): Promise<ContactItem[]> {
  const { data } = await apiClient.get<{ contacts: ContactItem[] }>("/users/contacts");
  return data.contacts;
}

export async function getDirectoryUsersRequest(query?: string): Promise<ChatUser[]> {
  const { data } = await apiClient.get<{ users: ChatUser[] }>("/users/directory", {
    params: query ? { q: query } : undefined,
  });
  return data.users;
}
