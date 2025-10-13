// API Configuration - Use environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth endpoints (relative paths - baseURL is already set in axios instance)
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  GET_PROFILE: '/auth/me',
  UPDATE_PROFILE: '/auth/updateprofile',
  CHANGE_PASSWORD: '/auth/changepassword',
  FORGOT_PASSWORD: '/auth/forgotpassword',
  VERIFY_OTP: '/auth/verifyotp',
  RESET_PASSWORD_OTP: '/auth/resetpasswordotp',
  RESET_PASSWORD: '/auth/resetpassword',
  DELETE_ACCOUNT: '/auth/account',
  
  // Journal endpoints
  JOURNAL: '/journal',
  JOURNAL_BY_ID: (id: string) => `/journal/${id}`,
  JOURNAL_SEARCH: '/journal/search',
  
  // Chat endpoints
  CHAT_SESSIONS: '/chat/sessions',
  CHAT_SESSION_BY_ID: (sessionId: string) => `/chat/sessions/${sessionId}`,
  CHAT_MESSAGES: (sessionId: string) => `/chat/sessions/${sessionId}/messages`,
};

export default API_BASE_URL;
