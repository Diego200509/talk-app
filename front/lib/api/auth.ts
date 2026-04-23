import { apiClient } from "@/lib/api/client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  nickname: string;
  status: string;
  avatarUrl: string;
};

export type AuthSession = { token: string; user: AuthUser };

export async function loginRequest(email: string, password: string): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/login", { email, password });
  return data;
}

export async function registerRequest(
  email: string,
  password: string,
  name: string
): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/register", {
    email,
    password,
    name,
  });
  return data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function forgotPasswordRequest(email: string): Promise<{ ok: boolean; message: string }> {
  const { data } = await apiClient.post<{ ok: boolean; message: string }>("/auth/forgot-password", {
    email,
  });
  return data;
}

export async function resetPasswordRequest(
  token: string,
  password: string
): Promise<{ ok: boolean; message: string }> {
  const { data } = await apiClient.post<{ ok: boolean; message: string }>("/auth/reset-password", {
    token,
    password,
  });
  return data;
}
