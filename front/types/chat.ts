export type MessageType = "text" | "image" | "document" | "voice";

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type?: MessageType;
  content: string;
  imageUrl?: string | null;
  documentUrl?: string | null;
  voiceUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  createdAt: string;
  deletedForEveryone?: boolean;
  deletedAt?: string | null;
  deliveredBy?: string[];
  readBy?: string[];
  blockedFor?: string[];
};

export type ChatUser = {
  id: string;
  email: string;
  name?: string | null;
  nickname?: string | null;
  status?: string | null;
  avatarUrl?: string | null;
};

export type ContactItem = {
  conversationId: string;
  user: ChatUser;
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
  muted?: boolean;
  blockedByMe?: boolean;
};

export type Conversation = {
  id: string;
  type?: string;
  participants?: ChatUser[];
  participantIds?: string[];
  lastMessage?: ChatMessage | null;
  muted?: boolean;
  unreadCount?: number;
  blockedByMe?: boolean;
  blocked?: boolean;
};

export type UploadedMedia = {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type SendMessagePayload = {
  type?: MessageType;
  content?: string;
  imageUrl?: string;
  documentUrl?: string;
  voiceUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  durationSeconds?: number;
};
