import type { AuthUser } from "@/stores/auth-store";
import type { ChatUser } from "@/types/chat";

export function toAuthUser(user: ChatUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name?.trim() || user.email.split("@")[0] || "",
    nickname: user.nickname?.trim() || "",
    status: user.status?.trim() || "Disponible",
    avatarUrl: user.avatarUrl?.trim() || "",
  };
}
