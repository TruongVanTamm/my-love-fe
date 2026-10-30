export interface User {
  id: string;
  email: string;
  displayName: string;
  coupleId: string | null;
}

export interface Couple {
  id: string;
  name: string;
  startedAt: string;
  timezone: string;
  members: {
    userId: string;
    displayName: string;
    role: 'owner' | 'member';
    joinedAt: string;
  }[];
}

export interface Dashboard {
  couple: Couple;
  relationship: {
    daysTogether: number;
    daysUntilAnniversary: number;
    nextAnniversary: string;
    isAnniversary: boolean;
  };
  quote: string;
  recentMemories?: Pick<Memory, 'id' | 'title' | 'happenedAt' | 'visibility' | 'mediaIds'>[];
}

export interface Memory {
  id: string;
  createdBy: string;
  title: string;
  description: string;
  happenedAt: string;
  tags: string[];
  visibility: 'shared' | 'private';
  mediaIds: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  media: { id: string; kind: 'image' | 'video' | 'audio' }[];
}
export interface Album {
  id: string;
  name: string;
  description: string;
  memoryIds: string[];
  createdAt: string;
}
export interface Milestone {
  id: string;
  title: string;
  description: string;
  happenedAt: string;
  highlighted: boolean;
  mediaIds: string[];
  createdBy: string;
}
export interface Page<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; hasNext: boolean };
}
export interface UploadTicket {
  id: string;
  uploadUrl: string;
  fields: Record<string, string>;
  maxBytes: number;
}
export interface MediaDownload {
  url: string;
  expiresAt: string;
}

export interface ApiResponse<T> {
  data: T;
}
export interface Invitation {
  url: string;
  expiresAt: string;
}

export interface OpenWhenLetter {
  id: string;
  senderId: string;
  recipientId: string;
  title: string;
  condition: string;
  theme: string;
  content: string | null;
  mediaIds: string[];
  openedAt: string | null;
  createdAt: string;
}
