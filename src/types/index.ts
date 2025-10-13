// User types
export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface AuthResponse {
  success: boolean;
  data: {
    _id: string;
    name: string;
    email: string;
    token: string;
  };
}

// Journal types
export interface JournalEntry {
  _id: string;
  userId: string;
  title: string;
  content: string;
  mood: 'very-happy' | 'happy' | 'neutral' | 'sad' | 'very-sad' | 'anxious' | 'calm' | 'stressed';
  tags: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalResponse {
  success: boolean;
  data: JournalEntry[];
  totalPages?: number;
  currentPage?: number;
  total?: number;
}

export interface CreateJournalEntryData {
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  isPrivate?: boolean;
}

// Chat types
export interface ChatSession {
  _id: string;
  userId: string;
  sessionId: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  isActive: boolean;
}

export interface ChatMessage {
  _id: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  success: boolean;
  data: {
    session: ChatSession;
    messages: ChatMessage[];
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ msg: string; param: string }>;
}
