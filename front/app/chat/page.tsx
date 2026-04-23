import type { Metadata } from "next";
import { ChatShell } from "@/components/chat/chat-shell";

export const metadata: Metadata = {
  title: "Chats — TalkApp",
  description: "Tus conversaciones en TalkApp",
};

export default function ChatPage() {
  return <ChatShell />;
}
