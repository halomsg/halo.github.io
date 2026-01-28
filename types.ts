
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  bio?: string;
  nameColor?: string; // Hex code or 'rainbow'
  createdAt: number;
  lastSeen?: number; // Timestamp
}

export type MemberRole = 'owner' | 'admin' | 'member';

export interface GroupMember {
  userId: string;
  role: MemberRole;
  joinedAt: number;
}

export interface GroupInvite {
  code: string;
  expiresAt: number;
  creatorId: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string; // Emoji
  type: 'private' | 'public';
  slug?: string; // Unique group username (3-10 chars)
  members: GroupMember[];
  bannedUserIds: string[];
  settings: {
    onlyAdminsCanPost: boolean;
  };
  pinnedMessageId?: string;
  invite?: GroupInvite;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface AuthError {
  field: string;
  message: string;
}

export type ViewState = 'login' | 'register' | 'chat';

export type Language = 'en' | 'ru';

export type MessageType = 'text' | 'audio' | 'system';

export interface MessageContent {
  type: MessageType;
  content: string; // Text or Base64 Audio
  duration?: number; // For audio
}