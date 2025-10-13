import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: number;
}

export interface MoodEntry {
  id: string;
  date: string;
  mood: number;
  emotion: string;
  energyLevel: string;
  socialConnection: string;
  timestamp: number;
}

export interface UserPreferences {
  journaling: boolean;
  voice: boolean;
  reminders: boolean;
  reminderTime: string;
}

export interface Streaks {
  journal: number;
  mood: number;
  meditation: number;
  lastJournalDate: string;
  lastMoodDate: string;
  lastMeditationDate: string;
}

export interface UserData {
  name: string;
  email: string;
  joinDate: string;
  avatar?: string;
}

interface AppContextType {
  // User
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Journal
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  updateJournalEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  
  // Mood
  moodEntries: MoodEntry[];
  addMoodEntry: (entry: Omit<MoodEntry, 'id' | 'timestamp'>) => void;
  
  // Streaks
  streaks: Streaks;
  updateStreak: (type: 'journal' | 'mood' | 'meditation') => void;
  
  // Preferences
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  
  // Loading & Errors
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [streaks, setStreaks] = useState<Streaks>({
    journal: 0,
    mood: 0,
    meditation: 0,
    lastJournalDate: '',
    lastMoodDate: '',
    lastMeditationDate: ''
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    journaling: true,
    voice: false,
    reminders: true,
    reminderTime: '21:00'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isAuthenticated) {
      saveToStorage();
    }
  }, [user, journalEntries, moodEntries, streaks, preferences, isAuthenticated]);

  const loadFromStorage = () => {
    try {
      const storedUser = localStorage.getItem('eunoia_user');
      const storedJournals = localStorage.getItem('eunoia_journals');
      const storedMoods = localStorage.getItem('eunoia_moods');
      const storedStreaks = localStorage.getItem('eunoia_streaks');
      const storedPreferences = localStorage.getItem('eunoia_preferences');
      const storedAuth = localStorage.getItem('eunoia_auth');

      if (storedAuth === 'true') {
        setIsAuthenticated(true);
      }

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (storedJournals) {
        setJournalEntries(JSON.parse(storedJournals));
      }

      if (storedMoods) {
        setMoodEntries(JSON.parse(storedMoods));
      }

      if (storedStreaks) {
        setStreaks(JSON.parse(storedStreaks));
      }

      if (storedPreferences) {
        setPreferences(JSON.parse(storedPreferences));
      }
    } catch (err) {
      console.error('Error loading from storage:', err);
      setError('Failed to load data');
    }
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem('eunoia_user', JSON.stringify(user));
      localStorage.setItem('eunoia_journals', JSON.stringify(journalEntries));
      localStorage.setItem('eunoia_moods', JSON.stringify(moodEntries));
      localStorage.setItem('eunoia_streaks', JSON.stringify(streaks));
      localStorage.setItem('eunoia_preferences', JSON.stringify(preferences));
      localStorage.setItem('eunoia_auth', isAuthenticated.toString());
    } catch (err) {
      console.error('Error saving to storage:', err);
      setError('Failed to save data');
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Basic validation
      if (!email || !password) {
        setError('Email and password are required');
        setIsLoading(false);
        return false;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return false;
      }

      // Password validation
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return false;
      }

      // For demo purposes, accept any valid email/password
      // In production, this would be an API call
      const userData: UserData = {
        name: email.split('@')[0],
        email: email,
        joinDate: new Date().toISOString().split('T')[0],
      };

      setUser(userData);
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError('Login failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('eunoia_auth');
  };

  const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setJournalEntries(prev => [newEntry, ...prev]);
    updateStreak('journal');
  };

  const updateJournalEntry = (id: string, updates: Partial<JournalEntry>) => {
    setJournalEntries(prev =>
      prev.map(entry => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const addMoodEntry = (entry: Omit<MoodEntry, 'id' | 'timestamp'>) => {
    const newEntry: MoodEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setMoodEntries(prev => [newEntry, ...prev]);
    updateStreak('mood');
  };

  const updateStreak = (type: 'journal' | 'mood' | 'meditation') => {
    const today = new Date().toISOString().split('T')[0];
    
    setStreaks(prev => {
      const lastDateKey = `last${type.charAt(0).toUpperCase() + type.slice(1)}Date` as keyof Streaks;
      const lastDate = prev[lastDateKey] as string;
      
      if (lastDate === today) {
        return prev; // Already updated today
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = prev[type] as number;
      
      if (lastDate === yesterdayStr) {
        newStreak += 1; // Continue streak
      } else if (lastDate !== today) {
        newStreak = 1; // Start new streak
      }

      return {
        ...prev,
        [type]: newStreak,
        [lastDateKey]: today,
      };
    });
  };

  const updatePreferences = (prefs: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  const value: AppContextType = {
    user,
    setUser,
    isAuthenticated,
    login,
    logout,
    journalEntries,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    moodEntries,
    addMoodEntry,
    streaks,
    updateStreak,
    preferences,
    updatePreferences,
    isLoading,
    error,
    setError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
