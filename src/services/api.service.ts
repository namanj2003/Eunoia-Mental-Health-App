import axios, { AxiosInstance } from 'axios';
import { API_ENDPOINTS } from '../config/api';
import type {
  AuthResponse,
  User,
  JournalEntry,
  JournalResponse,
  CreateJournalEntryData,
  ChatSession,
  ChatMessage,
  ApiResponse
} from '../types';

// Create axios instance - Use environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

console.log('API Service initialized');
console.log('Environment VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('Using API Base URL:', API_BASE_URL);

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds (Render free tier can take 30-50s to wake up)
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data
    });
    
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle responses
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not on login page
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// ============= Auth Services =============

export const authService = {
  /**
   * Register a new user
   */
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_ENDPOINTS.REGISTER, { 
      name, 
      email, 
      password 
    });
    
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    
    return response.data;
  },

  /**
   * Login user
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_ENDPOINTS.LOGIN, { 
      email, 
      password 
    });
    
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    
    return response.data;
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>(API_ENDPOINTS.GET_PROFILE);
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (name: string, email: string): Promise<ApiResponse<User>> => {
    const response = await api.put<ApiResponse<User>>(API_ENDPOINTS.UPDATE_PROFILE, {
      name,
      email,
    });
    
    if (response.data.success && response.data.data) {
      // Update stored user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...storedUser, ...response.data.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (
    currentPassword: string, 
    newPassword: string
  ): Promise<ApiResponse<{ token: string }>> => {
    const response = await api.put<ApiResponse<{ token: string }>>(
      API_ENDPOINTS.CHANGE_PASSWORD,
      {
        currentPassword,
        newPassword,
      }
    );
    
    if (response.data.success && response.data.data?.token) {
      // Update token after password change
      localStorage.setItem('token', response.data.data.token);
    }
    
    return response.data;
  },

  /**
   * Request password reset (sends OTP via email)
   */
  forgotPassword: async (email: string): Promise<ApiResponse<{ email: string; expiresIn: string }>> => {
    const response = await api.post<ApiResponse<{ email: string; expiresIn: string }>>(
      API_ENDPOINTS.FORGOT_PASSWORD,
      { email }
    );
    return response.data;
  },

  /**
   * Verify OTP
   */
  verifyOTP: async (email: string, otp: string): Promise<ApiResponse<{ email: string }>> => {
    const response = await api.post<ApiResponse<{ email: string }>>(
      API_ENDPOINTS.VERIFY_OTP,
      { email, otp }
    );
    return response.data;
  },

  /**
   * Reset password with OTP
   */
  resetPasswordWithOTP: async (
    email: string,
    otp: string,
    newPassword: string
  ): Promise<ApiResponse<{ token: string }>> => {
    const response = await api.put<ApiResponse<{ token: string }>>(
      API_ENDPOINTS.RESET_PASSWORD_OTP,
      { email, otp, newPassword }
    );
    
    if (response.data.success && response.data.data?.token) {
      // Update token after password reset
      localStorage.setItem('token', response.data.data.token);
    }
    
    return response.data;
  },

  /**
   * Reset password with token (legacy method)
   */
  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse<{ token: string }>> => {
    const response = await api.put<ApiResponse<{ token: string }>>(
      `${API_ENDPOINTS.RESET_PASSWORD}/${token}`,
      { password: newPassword }
    );
    
    if (response.data.success && response.data.data?.token) {
      // Update token after password reset
      localStorage.setItem('token', response.data.data.token);
    }
    
    return response.data;
  },

  /**
   * Delete user account and all associated data
   */
  deleteAccount: async (): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(API_ENDPOINTS.DELETE_ACCOUNT);
    
    if (response.data.success) {
      // Clear local storage after successful deletion
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    return response.data;
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
};

// ============= Journal Services =============

export const journalService = {
  /**
   * Get all journal entries for current user
   */
  getAllEntries: async (page = 1, limit = 10): Promise<JournalResponse> => {
    const response = await api.get<JournalResponse>(API_ENDPOINTS.JOURNAL, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get single journal entry
   */
  getEntry: async (id: string): Promise<ApiResponse<JournalEntry>> => {
    const response = await api.get<ApiResponse<JournalEntry>>(
      API_ENDPOINTS.JOURNAL_BY_ID(id)
    );
    return response.data;
  },

  /**
   * Create new journal entry
   */
  createEntry: async (entry: CreateJournalEntryData): Promise<ApiResponse<JournalEntry>> => {
    const response = await api.post<ApiResponse<JournalEntry>>(
      API_ENDPOINTS.JOURNAL,
      entry
    );
    return response.data;
  },

  /**
   * Update journal entry
   */
  updateEntry: async (
    id: string,
    entry: Partial<CreateJournalEntryData>
  ): Promise<ApiResponse<JournalEntry>> => {
    const response = await api.put<ApiResponse<JournalEntry>>(
      API_ENDPOINTS.JOURNAL_BY_ID(id),
      entry
    );
    return response.data;
  },

  /**
   * Delete journal entry
   */
  deleteEntry: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete<ApiResponse>(
      API_ENDPOINTS.JOURNAL_BY_ID(id)
    );
    return response.data;
  },

  /**
   * Search journal entries
   */
  searchEntries: async (
    query?: string,
    mood?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await api.get<ApiResponse<JournalEntry[]>>(
      API_ENDPOINTS.JOURNAL_SEARCH,
      {
        params: { query, mood, startDate, endDate },
      }
    );
    return response.data;
  },
};

// ============= Chat Services =============

export const chatService = {
  /**
   * Get all chat sessions for current user
   */
  getAllSessions: async (): Promise<ApiResponse<ChatSession[]>> => {
    const response = await api.get<ApiResponse<ChatSession[]>>(
      API_ENDPOINTS.CHAT_SESSIONS
    );
    return response.data;
  },

  /**
   * Create new chat session
   */
  createSession: async (title: string = 'New Chat'): Promise<ApiResponse<ChatSession>> => {
    const response = await api.post<ApiResponse<ChatSession>>(
      API_ENDPOINTS.CHAT_SESSIONS,
      { title }
    );
    return response.data;
  },

  /**
   * Get chat session with messages
   */
  getSession: async (sessionId: string): Promise<ApiResponse<{
    session: ChatSession;
    messages: ChatMessage[];
  }>> => {
    const response = await api.get(API_ENDPOINTS.CHAT_SESSION_BY_ID(sessionId));
    return response.data;
  },

  /**
   * Update chat session title
   */
  updateSession: async (
    sessionId: string,
    title: string
  ): Promise<ApiResponse<ChatSession>> => {
    const response = await api.put<ApiResponse<ChatSession>>(
      API_ENDPOINTS.CHAT_SESSION_BY_ID(sessionId),
      { title }
    );
    return response.data;
  },

  /**
   * Delete chat session
   */
  deleteSession: async (sessionId: string): Promise<ApiResponse> => {
    const response = await api.delete<ApiResponse>(
      API_ENDPOINTS.CHAT_SESSION_BY_ID(sessionId)
    );
    return response.data;
  },

  /**
   * Get messages for a session
   */
  getMessages: async (
    sessionId: string,
    limit = 50,
    before?: string
  ): Promise<ApiResponse<ChatMessage[]>> => {
    const response = await api.get<ApiResponse<ChatMessage[]>>(
      API_ENDPOINTS.CHAT_MESSAGES(sessionId),
      {
        params: { limit, before },
      }
    );
    return response.data;
  },

  /**
   * Add message to session
   */
  addMessage: async (
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<ApiResponse<ChatMessage>> => {
    const response = await api.post<ApiResponse<ChatMessage>>(
      API_ENDPOINTS.CHAT_MESSAGES(sessionId),
      {
        role,
        content,
      }
    );
    return response.data;
  },
};

// Export the axios instance for custom requests if needed
export default api;
