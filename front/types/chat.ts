export type MessageType = "text" | "image" | "document" | "voice" | "system" | "linkPreview";

export type LinkPreview = {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  domain?: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type?: MessageType;
  content: string;
  systemText?: string | null;
  linkPreview?: LinkPreview | null;
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

export type ConversationType = "direct" | "group";

export type ContactItem = {
  conversationId: string;
  type?: ConversationType;
  user?: ChatUser;
  name?: string;
  description?: string;
  avatarUrl?: string | null;
  memberCount?: number;
  adminIds?: string[];
  isAdmin?: boolean;
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
  muted?: boolean;
  blockedByMe?: boolean;
};

export type GroupConversation = {
  id: string;
  type: "group";
  name: string;
  description?: string;
  avatarUrl?: string | null;
  participants: ChatUser[];
  participantIds: string[];
  adminIds: string[];
  createdBy?: string | null;
  memberCount?: number;
  isAdmin?: boolean;
  muted?: boolean;
  unreadCount?: number;
  lastMessage?: ChatMessage | null;
};

export type Conversation = {
  id: string;
  type?: ConversationType;
  participants?: ChatUser[];
  participantIds?: string[];
  lastMessage?: ChatMessage | null;
  muted?: boolean;
  unreadCount?: number;
  blockedByMe?: boolean;
  blocked?: boolean;
  name?: string;
  description?: string;
  avatarUrl?: string | null;
  adminIds?: string[];
  isAdmin?: boolean;
  memberCount?: number;
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
