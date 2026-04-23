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
};

export type ContactItem = {
  conversationId: string;
  user: ChatUser;
  lastMessage: ChatMessage | null;
};

export type Conversation = {
  id: string;
  type: "direct";
  participants: ChatUser[];
  lastMessage: ChatMessage | null;
};
