export type ChatUser = {
  id: string;
  email: string;
  name: string;
  nickname: string;
  status: string;
  avatarUrl: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  deletedForEveryone?: boolean;
  deletedAt?: string | null;
  deliveredBy?: string[];
  readBy?: string[];
  blockedFor?: string[];
};

export type ContactItem = {
  conversationId: string;
  user: ChatUser;
  lastMessage: ChatMessage | null;
  unreadCount?: number;
  muted?: boolean;
  blockedByMe?: boolean;
  blocked?: boolean;
};

export type Conversation = {
  id: string;
  type: "direct";
  participants: ChatUser[];
  lastMessage: ChatMessage | null;
  muted?: boolean;
  unreadCount?: number;
  blockedByMe?: boolean;
  blocked?: boolean;
};
