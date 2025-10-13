import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';
import { Switch } from './components/ui/switch';
import { useKeystrokeCapture } from './hooks/useKeystrokeCapture';
import { 
  Send,
  Heart,
  Brain,
  Sparkles,
  ArrowRight,
  Settings,
  FileText,
  Shield,
  Download,
  Flame,
  Award,
  Target,
  TrendingUp,
  Plus,
  ChevronRight,
  ChevronDown,
  Lightbulb,
  BookOpen,
  BarChart3,
  MessageCircle,
  Trash2,
  History,
  X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';

type Screen = 'login' | 'onboarding' | 'home' | 'journal' | 'new-journal' | 'mood-questionnaire' | 'insights' | 'ai-chat' | 'chat-history' | 'profile' | 'privacy';

interface MoodEntry {
  date: string;
  mood: number;
  emotion: string;
}

interface EmotionData {
  name: string;
  value: number;
  color: string;
}

const MentalHealthApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentMood, setCurrentMood] = useState([7]);
  const [journalText, setJournalText] = useState('');
  const [journalTitle, setJournalTitle] = useState('');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [preferences, setPreferences] = useState({
    journaling: true,
    aiChat: true
  });
  const [colorContrast, setColorContrast] = useState<'standard' | 'high' | 'low'>('standard');
  const [currentUser, setCurrentUser] = useState<{ _id: string; name: string; email: string } | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  
  // Keystroke capture for ML analysis
  const { handleKeyDown, handleKeyUp, getMetrics, reset: resetKeystrokes } = useKeystrokeCapture();

  // Check for existing authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    
    console.log('App mounted - checking authentication', { hasToken: !!token, hasUser: !!user, hasCompletedOnboarding });
    
    // Only proceed to app if we have valid token and user data
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (userData && userData._id) {
          console.log('Valid user found in localStorage');
          setCurrentUser(userData);
          // Check if user has completed onboarding before
          if (hasCompletedOnboarding === 'true') {
            console.log('User has completed onboarding, going to home');
            setCurrentScreen('home');
          } else {
            console.log('User has not completed onboarding, showing onboarding');
            setCurrentScreen('onboarding');
          }
        } else {
          console.log('Invalid user data, clearing localStorage');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('hasCompletedOnboarding');
          setCurrentScreen('login');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('hasCompletedOnboarding');
        setCurrentScreen('login');
      }
    } else {
      console.log('No authentication found, showing login screen');
      setCurrentScreen('login');
    }
  }, []);

  // Sign out handler
  const handleSignOut = () => {
    console.log('Signing out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('hasCompletedOnboarding');
    setCurrentUser(null);
    setCurrentScreen('login');
    
    // Clear all user-specific data
    setJournalEntries([]);
    setChatMessages([{ role: 'ai', content: "Hello! I'm your wellness companion. How are you feeling today?" }]);
    setCurrentSessionId(null);
    setChatSessions([]);
    setShowChatHistory(false);
    setStreaks({
      journal: 0,
      mood: 0,
      meditation: 0
    });
    setJournalText('');
    setJournalTitle('');
    resetKeystrokes();
  };

  // Redirect from disabled screens
  useEffect(() => {
    if (currentScreen === 'journal' && !preferences.journaling) {
      setCurrentScreen('home');
    }
    if (currentScreen === 'ai-chat' && !preferences.aiChat) {
      setCurrentScreen('home');
    }
  }, [currentScreen, preferences]);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', content: "Hello! I'm your wellness companion. How are you feeling today?" }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [moodAnswers, setMoodAnswers] = useState<{[key: string]: string}>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [dailyWellnessCompleted, setDailyWellnessCompleted] = useState(false);
  const [analyzedMood, setAnalyzedMood] = useState<{mood: number, analysis: string} | null>(null);
  
  // Streak tracking state
  const [streaks, setStreaks] = useState({
    journal: 0,
    mood: 0,
    meditation: 0
  });

  // Journal entries state
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [isLoadingJournals, setIsLoadingJournals] = useState(false);

  // API Configuration - Use environment variable
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  
  // Axios instance with auth token
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // Helper function to get emoji for emotion
  const getEmotionEmoji = (emotion: string): string => {
    const emojiMap: { [key: string]: string } = {
      'anger': '😠',
      'annoyance': '😤',
      'joy': '😊',
      'happiness': '😄',
      'sadness': '😢',
      'fear': '😨',
      'anxiety': '😰',
      'nervousness': '😟',
      'love': '❤️',
      'excitement': '🤩',
      'surprise': '😲',
      'disgust': '🤢',
      'confusion': '😕',
      'disappointment': '😞',
      'embarrassment': '😳',
      'gratitude': '🙏',
      'grief': '😭',
      'optimism': '🌟',
      'pride': '😌',
      'relief': '😌',
      'remorse': '😔',
      'admiration': '😍',
      'amusement': '😄',
      'approval': '👍',
      'caring': '🤗',
      'curiosity': '🤔',
      'desire': '😍',
      'disapproval': '👎',
      'realization': '💡',
      'neutral': '😐'
    };
    return emojiMap[emotion.toLowerCase()] || '😐';
  };

  // Calculate real emotion data from journal entries
  const getEmotionBreakdown = () => {
    if (journalEntries.length === 0) {
      return [
        { name: 'No data yet', value: 100, color: '#E5E7EB' }
      ];
    }

    const emotionCounts: { [key: string]: number } = {};
    const emotionColors: { [key: string]: string } = {
      'anger': '#EF4444',
      'joy': '#10B981',
      'sadness': '#3B82F6',
      'fear': '#8B5CF6',
      'love': '#EC4899',
      'excitement': '#F59E0B',
      'gratitude': '#14B8A6',
      'neutral': '#9CA3AF',
      'optimism': '#84CC16',
      'disappointment': '#F97316',
      'nervousness': '#A855F7',
      'caring': '#06B6D4'
    };

    // Count emotions from ML analysis
    journalEntries.forEach((entry: any) => {
      if (entry.mlAnalysis?.primary_emotion) {
        const emotion = entry.mlAnalysis.primary_emotion;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    });

    // Convert to percentages
    const total = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
    const emotionData = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        value: Math.round((count / total) * 100),
        color: emotionColors[emotion] || '#6B7280'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 emotions

    return emotionData;
  };

  // Get mood trend data from recent journal entries
  const getMoodTrendData = () => {
    const last7Days = journalEntries
      .filter((entry: any) => {
        const entryDate = new Date(entry.createdAt);
        const daysDiff = (Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (last7Days.length === 0) {
      // Default placeholder if no entries
      return [
        { date: 'Mon', mood: 5, emotion: 'neutral' },
        { date: 'Tue', mood: 5, emotion: 'neutral' },
        { date: 'Wed', mood: 5, emotion: 'neutral' },
        { date: 'Thu', mood: 5, emotion: 'neutral' },
        { date: 'Fri', mood: 5, emotion: 'neutral' },
        { date: 'Sat', mood: 5, emotion: 'neutral' },
        { date: 'Sun', mood: 5, emotion: 'neutral' }
      ];
    }

    // Convert emotions to mood scores (1-10)
    const emotionToScore: { [key: string]: number } = {
      'joy': 9,
      'excitement': 9,
      'love': 8,
      'gratitude': 8,
      'optimism': 7,
      'amusement': 7,
      'admiration': 7,
      'pride': 7,
      'relief': 6,
      'caring': 6,
      'neutral': 5,
      'curiosity': 5,
      'surprise': 5,
      'confusion': 4,
      'nervousness': 3,
      'disappointment': 3,
      'sadness': 2,
      'fear': 2,
      'anger': 2,
      'grief': 1,
      'disgust': 2
    };

    return last7Days.map((entry: any) => {
      const date = new Date(entry.createdAt);
      const emotion = entry.mlAnalysis?.primary_emotion || 'neutral';
      const score = emotionToScore[emotion] || 5;
      
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        mood: score,
        emotion: emotion
      };
    });
  };

  // Calculate positivity score based on recent emotions
  const getPositivityScore = () => {
    if (journalEntries.length === 0) return 50;

    const positiveEmotions = ['joy', 'excitement', 'love', 'gratitude', 'optimism', 'amusement', 'admiration', 'pride', 'relief'];
    const recentEntries = journalEntries.slice(0, 10); // Last 10 entries
    
    const positiveCount = recentEntries.filter((entry: any) => 
      positiveEmotions.includes(entry.mlAnalysis?.primary_emotion?.toLowerCase())
    ).length;

    return Math.round((positiveCount / recentEntries.length) * 100);
  };

  // Get dominant emotion from recent entries
  const getDominantEmotion = () => {
    if (journalEntries.length === 0) return null;

    const emotionCounts: { [key: string]: number } = {};
    const recentEntries = journalEntries.slice(0, 10);

    recentEntries.forEach((entry: any) => {
      if (entry.mlAnalysis?.primary_emotion) {
        const emotion = entry.mlAnalysis.primary_emotion;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    });

    const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    return dominant ? dominant[0] : null;
  };

  // Journal API Functions
  const fetchJournalEntries = async () => {
    try {
      setIsLoadingJournals(true);
      const response = await axios.get(`${API_BASE_URL}/journal`, getAuthConfig());
      if (response.data.success) {
        setJournalEntries(response.data.data);
        // Calculate streak after entries are loaded
        setTimeout(() => updateStreaksFromEntries(), 100);
      }
    } catch (error: any) {
      console.error('Error fetching journal entries:', error);
      if (error.response?.status === 401) {
        handleSignOut();
      }
    } finally {
      setIsLoadingJournals(false);
    }
  };

  const createJournalEntry = async (entryData: any) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/journal`, entryData, getAuthConfig());
      if (response.data.success) {
        await fetchJournalEntries(); // Refresh list
        return response.data.data;
      }
    } catch (error: any) {
      console.error('Error creating journal entry:', error);
      alert('Failed to save journal entry. Please try again.');
      throw error;
    }
  };

  const deleteJournalEntry = async (entryId: string) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/journal/${entryId}`, getAuthConfig());
      if (response.data.success) {
        // Remove from local state immediately
        setJournalEntries(prev => prev.filter(entry => entry._id !== entryId));
        // Update streak count based on remaining entries
        updateStreaksFromEntries();
        return true;
      }
    } catch (error: any) {
      console.error('Error deleting journal entry:', error);
      alert('Failed to delete journal entry. Please try again.');
      return false;
    }
  };

  // Calculate streak from journal entries
  const updateStreaksFromEntries = () => {
    // Calculate current streak based on entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    // Sort entries by date descending
    const sortedEntries = [...journalEntries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Check consecutive days
    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].createdAt);
      entryDate.setHours(0, 0, 0, 0);
      
      if (entryDate.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (entryDate.getTime() < checkDate.getTime()) {
        break;
      }
    }
    
    setStreaks(prev => ({
      ...prev,
      journal: currentStreak
    }));
  };

  // Load journal entries when user is authenticated and journaling is enabled
  useEffect(() => {
    if (currentUser && preferences.journaling && currentScreen === 'journal') {
      fetchJournalEntries();
    }
  }, [currentUser, preferences.journaling, currentScreen]);

  // Chat API Functions
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  
  const fetchChatSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/sessions`, getAuthConfig());
      if (response.data.success) {
        setChatSessions(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching chat sessions:', error);
    }
  };
  
  const createChatSession = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/sessions`,
        { title: 'New Chat' },
        getAuthConfig()
      );
      if (response.data.success) {
        setCurrentSessionId(response.data.data.sessionId);
        return response.data.data.sessionId;
      }
    } catch (error: any) {
      console.error('Error creating chat session:', error);
      return null;
    }
  };

  const sendChatMessage = async (content: string, role: 'user' | 'assistant') => {
    if (!currentSessionId) {
      const newSessionId = await createChatSession();
      if (!newSessionId) return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/sessions/${currentSessionId}/messages`,
        { role, content },
        getAuthConfig()
      );
      return response.data.success;
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      return false;
    }
  };

  const loadChatSession = async (sessionId: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/sessions/${sessionId}`,
        getAuthConfig()
      );
      if (response.data.success) {
        const messages = response.data.data.messages.map((msg: any) => ({
          role: msg.role === 'assistant' ? 'ai' : msg.role,
          content: msg.content
        }));
        setChatMessages(messages);
      }
    } catch (error: any) {
      console.error('Error loading chat session:', error);
    }
  };

  // Initialize chat session when entering ai-chat screen
  useEffect(() => {
    if (currentUser && preferences.aiChat && currentScreen === 'ai-chat' && !currentSessionId) {
      createChatSession();
    }
  }, [currentUser, preferences.aiChat, currentScreen]);

  // Mock data
  // Get real data from journal entries with ML analysis
  const moodData: MoodEntry[] = getMoodTrendData();
  const emotionData: EmotionData[] = getEmotionBreakdown();
  const positivityScore = getPositivityScore();
  const dominantEmotion = getDominantEmotion();

  const moodEmojis = ['😔', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '🥰', '🌟'];

  const dailyPrompts = [
    "What made you smile today?",
    "What are you grateful for right now?",
    "How did you take care of yourself today?",
    "What's one positive thing that happened?",
    "What emotion are you experiencing most?"
  ];

  const streakMilestones = [
    { days: 7, title: "Week Warrior", icon: "🌟", color: "#68d391" },
    { days: 14, title: "Mindful Master", icon: "🧘", color: "#667eea" },
    { days: 30, title: "Wellness Champion", icon: "🏆", color: "#f093fb" },
    { days: 60, title: "Peace Pioneer", icon: "🕊️", color: "#764ba2" },
    { days: 100, title: "Zen Legend", icon: "🦋", color: "#ffecd2" }
  ];

  const getCurrentMilestone = (streak: number) => {
    return streakMilestones
      .filter(milestone => streak >= milestone.days)
      .sort((a, b) => b.days - a.days)[0];
  };

  const getNextMilestone = (streak: number) => {
    return streakMilestones.find(milestone => streak < milestone.days);
  };

  // Mood questionnaire
  const moodQuestions = [
    {
      question: "How would you describe your energy level today?",
      options: [
        { text: "Very low, feeling drained", value: "low", mood: 3 },
        { text: "Somewhat tired but manageable", value: "moderate-low", mood: 5 },
        { text: "Balanced and steady", value: "balanced", mood: 7 },
        { text: "Energetic and motivated", value: "high", mood: 9 }
      ]
    },
    {
      question: "What's your main emotional state right now?",
      options: [
        { text: "Anxious or worried", value: "anxious", mood: 4 },
        { text: "Sad or down", value: "sad", mood: 3 },
        { text: "Content and peaceful", value: "content", mood: 7 },
        { text: "Happy and optimistic", value: "happy", mood: 8 }
      ]
    },
    {
      question: "How connected do you feel to others today?",
      options: [
        { text: "Very isolated and alone", value: "isolated", mood: 2 },
        { text: "Somewhat disconnected", value: "disconnected", mood: 4 },
        { text: "Reasonably connected", value: "connected", mood: 7 },
        { text: "Very supported and loved", value: "supported", mood: 9 }
      ]
    }
  ];

  const suggestedPrompts = [
    "I'm feeling overwhelmed with work lately",
    "I want to build better habits",
    "Help me with anxiety management",
    "I'm struggling with sleep",
    "I need motivation today",
    "How can I practice self-care?"
  ];

  const sendMessage = useCallback(async (message?: string) => {
    const messageToSend = message || newMessage;
    if (!messageToSend.trim()) return;
    
    // Add user message to UI
    setChatMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    
    // Save user message to database
    await sendChatMessage(messageToSend, 'user');
    
    // More empathetic and contextual AI responses
    setTimeout(async () => {
      let responses: string[] = [];
      
      if (messageToSend.toLowerCase().includes('overwhelmed') || messageToSend.toLowerCase().includes('stress')) {
        responses = [
          "I can really hear the weight you're carrying right now. Feeling overwhelmed is so valid, and I'm here with you. Let's take this one breath at a time. What feels like the most pressing thing on your mind?",
          "Thank you for trusting me with how you're feeling. Overwhelm can feel so isolating, but you're not alone in this. Sometimes breaking things down into smaller pieces can help. What's one small thing we could focus on right now?",
          "I sense you're carrying a lot right now, and that takes such strength. Your feelings are completely understandable. Have you been able to take any moments for yourself today, even just a few deep breaths?"
        ];
      } else if (messageToSend.toLowerCase().includes('sad') || messageToSend.toLowerCase().includes('down')) {
        responses = [
          "I'm holding space for your sadness right now. It's okay to feel down - these feelings are part of being human, and they're telling us something important. You don't have to carry this alone. What's been weighing on your heart?",
          "Thank you for being so honest about how you're feeling. Sadness can feel so heavy, and I want you to know that what you're experiencing matters. Sometimes just acknowledging these feelings can be the first step toward healing. How long have you been feeling this way?",
          "I can feel the tenderness in what you're sharing. It's brave to acknowledge when we're struggling. Your feelings are valid, and you deserve support through this. Is there anything specific that's been contributing to these feelings?"
        ];
      } else if (messageToSend.toLowerCase().includes('anxiety') || messageToSend.toLowerCase().includes('anxious')) {
        responses = [
          "I hear the anxiety in your words, and I want you to know that you're safe here with me. Anxiety can feel so consuming, but you're stronger than you know. Let's try grounding together - can you tell me 3 things you can see around you right now?",
          "Anxiety has such a powerful voice, doesn't it? But I want to remind you of your own inner wisdom and strength. You've gotten through difficult moments before. What has helped you feel more grounded in the past?",
          "I'm here with you through this anxious feeling. Your nervous system is trying to protect you, even if it doesn't feel helpful right now. Would it help to try some gentle breathing together, or would you rather talk about what's triggering these feelings?"
        ];
      } else if (messageToSend.toLowerCase().includes('happy') || messageToSend.toLowerCase().includes('good') || messageToSend.toLowerCase().includes('great')) {
        responses = [
          "I can feel the lightness in your words, and it brings me so much joy! These positive moments are precious gifts. What's been contributing to this good feeling? I'd love to celebrate this with you.",
          "Your happiness is radiating through your message! It's beautiful to witness your joy. These moments of contentment are so important to honor and remember. What's been bringing you the most fulfillment lately?",
          "I'm so glad you're feeling good! Your positive energy is wonderful. Sometimes when we're in a good space, it's a perfect time to reflect on what's working well in our lives. What's been supporting this sense of wellbeing?"
        ];
      } else {
        responses = [
          "Thank you for sharing that with me. I'm really listening to what you're saying, and I want you to know that your experiences and feelings matter deeply. What feels most important for you to explore right now?",
          "I appreciate you opening up about this. Your self-awareness is truly a strength. Sometimes just having someone witness our thoughts can be healing. How are you feeling about what you just shared?",
          "I'm here with you in this moment. What you're experiencing is valid and important. You have such wisdom within you, even when things feel unclear. What does your intuition tell you about this situation?"
        ];
      }
      
      const aiResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: aiResponse
      }]);
      
      // Save AI response to database
      await sendChatMessage(aiResponse, 'assistant');
    }, 1500);
    
    setNewMessage('');
  }, [newMessage, currentSessionId]);

  const getMoodEmoji = (mood: number) => {
    if (mood >= 9) return '🌟';
    if (mood >= 8) return '😊';
    if (mood >= 7) return '🙂';
    if (mood >= 6) return '😌';
    if (mood >= 5) return '😐';
    if (mood >= 4) return '😕';
    if (mood >= 3) return '😔';
    return '💙';
  };

  const getMoodLabel = (mood: number) => {
    if (mood >= 8) return 'Excellent';
    if (mood >= 7) return 'Good';
    if (mood >= 6) return 'Balanced';
    if (mood >= 5) return 'Neutral';
    if (mood >= 4) return 'Low';
    return 'Struggling';
  };

  // Get max streak based on enabled features
  const getMaxStreak = () => {
    if (preferences.journaling) {
      return Math.max(streaks.journal, streaks.mood);
    }
    return streaks.mood;
  };

  // Color theme based on contrast preference - returns actual color values
  const colors = (() => {
    if (colorContrast === 'high') {
      return {
        primary: '#5b21b6', // Bright vibrant purple
        secondary: '#ec4899', // Bright vibrant pink
        accent: '#6366f1', // Bright vibrant indigo
        bgGradientFrom: '#f0f9ff',
        bgGradientTo: '#dbeafe',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#334155',
        gradient: 'from-[#5b21b6] to-[#ec4899]',
        bgGradient: 'from-[#f0f9ff] to-[#dbeafe]'
      };
    } else if (colorContrast === 'low') {
      return {
        primary: '#a8b3d1', // Soft powder blue
        secondary: '#e8b4d6', // Soft rose pink
        accent: '#b8a8d8', // Soft lilac
        bgGradientFrom: '#fdfcfd',
        bgGradientTo: '#f8f6f9',
        cardBg: '#fefefd',
        textPrimary: '#4a4d5a',
        textSecondary: '#6b6e7b',
        gradient: 'from-[#a8b3d1] to-[#e8b4d6]',
        bgGradient: 'from-[#fdfcfd] to-[#f8f6f9]'
      };
    }
    // Standard contrast (default) - vibrant but balanced (ORIGINAL)
    return {
      primary: '#667eea',
      secondary: '#f093fb',
      accent: '#764ba2',
      bgGradientFrom: '#fafbff',
      bgGradientTo: '#e6f3ff',
      cardBg: '#f7fafc',
      textPrimary: '#2d3748',
      textSecondary: '#4a5568',
      gradient: 'from-[#667eea] to-[#f093fb]',
      bgGradient: 'from-[#fafbff] to-[#e6f3ff]'
    };
  })();

  // Apply contrast styling with dynamic color values
  const getContrastStyles = (): React.CSSProperties => {
    if (colorContrast === 'high') {
      return {
        '--color-primary': '#5b21b6', // Bright vibrant purple
        '--color-secondary': '#ec4899', // Bright vibrant pink
        '--color-accent': '#6366f1', // Bright vibrant indigo
        '--color-bg-from': '#f0f9ff', // Lighter background
        '--color-bg-to': '#dbeafe', // Lighter background
        '--color-card-bg': '#ffffff', // Pure white cards
        '--color-text-primary': '#1e293b', // Darker text for contrast
        '--color-text-secondary': '#334155', // Darker secondary text
      } as React.CSSProperties;
    } else if (colorContrast === 'low') {
      return {
        '--color-primary': '#a8b3d1', // Soft powder blue
        '--color-secondary': '#e8b4d6', // Soft rose pink
        '--color-accent': '#b8a8d8', // Soft lilac
        '--color-bg-from': '#fdfcfd', // Very light with warmth
        '--color-bg-to': '#f8f6f9', // Light with gentle tint
        '--color-card-bg': '#fefefd', // Warm off-white
        '--color-text-primary': '#4a4d5a', // Readable soft text
        '--color-text-secondary': '#6b6e7b', // Medium soft text
      } as React.CSSProperties;
    }
    // Standard contrast - vibrant but balanced (ORIGINAL)
    return {
      '--color-primary': '#667eea', // Standard vibrant blue
      '--color-secondary': '#f093fb', // Standard vibrant pink
      '--color-accent': '#764ba2', // Standard purple
      '--color-bg-from': '#fafbff', // Soft white-blue
      '--color-bg-to': '#e6f3ff', // Soft blue
      '--color-card-bg': '#f7fafc', // Soft white
      '--color-text-primary': '#2d3748', // Standard dark text
      '--color-text-secondary': '#4a5568', // Standard gray text
    } as React.CSSProperties;
  };

  const analyzeMoodFromQuestionnaire = () => {
    const answers = Object.values(moodAnswers);
    const moodScores = answers.map(answer => {
      const question = moodQuestions.find(q => 
        q.options.some(opt => opt.value === answer)
      );
      return question?.options.find(opt => opt.value === answer)?.mood || 5;
    });
    
    const averageMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
    
    let analysis = "";
    if (averageMood >= 8) {
      analysis = "You're in a wonderful headspace today! Your responses show high energy, positive emotions, and strong social connections. This is a great time to celebrate your wellbeing and perhaps set intentions for maintaining this positive momentum.";
    } else if (averageMood >= 6) {
      analysis = "You're doing reasonably well today. While there might be some areas of challenge, you're maintaining a balanced perspective. Consider what small actions might help you feel even more supported and energized.";
    } else if (averageMood >= 4) {
      analysis = "I notice you're experiencing some difficulties today. It's completely okay to have challenging days - they're part of the human experience. Consider reaching out for support and practicing extra self-compassion today.";
    } else {
      analysis = "It sounds like today has been particularly tough for you. Please know that these feelings are temporary, even when they feel overwhelming. You deserve support and care. Consider connecting with someone you trust or engaging in gentle self-care practices.";
    }
    
    return { mood: Math.round(averageMood), analysis };
  };

  // Login Screen
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          // Clear all previous user data first
          setJournalEntries([]);
          setChatMessages([{ role: 'ai', content: "Hello! I'm your wellness companion. How are you feeling today?" }]);
          setCurrentSessionId(null);
          setChatSessions([]);
          setShowChatHistory(false);
          setStreaks({
            journal: 0,
            mood: 0,
            meditation: 0
          });
          setJournalText('');
          setJournalTitle('');
          resetKeystrokes();
          
          // Get user data from localStorage and set it
          const user = localStorage.getItem('user');
          if (user) {
            try {
              const userData = JSON.parse(user);
              setCurrentUser(userData);
            } catch (error) {
              console.error('Error parsing user data:', error);
            }
          }
          setCurrentScreen('onboarding');
        }}
      />
    );
  }

  if (currentScreen === 'onboarding') {
    const onboardingScreens = [
      {
        title: "Welcome to Eunoia",
        subtitle: "Your AI-powered companion for mental wellness and beautiful thinking",
        content: (
          <div className="text-center space-y-8">
            {/* Eunoia Logo */}
            <div className="relative">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-full flex items-center justify-center shadow-2xl">
                <div className="text-6xl font-bold text-white flex items-center">
                  <Brain className="mr-2" size={40} />
                  ε
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="text-yellow-600" size={16} />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-[#667eea] to-[#f093fb] bg-clip-text text-transparent">
                εὔνοια (Eunoia)
              </h2>
              <p className="text-gray-600 text-sm italic">
                "Beautiful thinking" - the goodwill between mind and heart
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-3xl">
                <div className="w-12 h-12 bg-white/70 rounded-2xl flex items-center justify-center">
                  <Heart className="text-[#667eea]" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Mindful Mood Tracking</p>
                  <p className="text-sm text-gray-600">AI-powered emotional insights</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#fed7e2] to-[#ffecd2] rounded-3xl">
                <div className="w-12 h-12 bg-white/70 rounded-2xl flex items-center justify-center">
                  <BookOpen className="text-[#f093fb]" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Sacred Journaling</p>
                  <p className="text-sm text-gray-600">Your private sanctuary for thoughts</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#ffecd2] to-[#e6f3ff] rounded-3xl">
                <div className="w-12 h-12 bg-white/70 rounded-2xl flex items-center justify-center">
                  <Brain className="text-[#764ba2]" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Compassionate AI</p>
                  <p className="text-sm text-gray-600">Empathetic support when you need it</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-3xl">
                <div className="w-12 h-12 bg-white/70 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="text-[#667eea]" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Growth Insights</p>
                  <p className="text-sm text-gray-600">Patterns that illuminate your journey</p>
                </div>
              </div>
            </div>
          </div>
        )
      },
      {
        title: "How would you like to express yourself?",
        subtitle: "Choose your preferred methods of self-reflection",
        content: (
          <div className="space-y-8">
            {/* Visual representation */}
            <div className="text-center">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-3xl flex items-center justify-center shadow-xl">
                <Sparkles className="text-white" size={32} />
              </div>
            </div>
            
            <div className="space-y-4">
              <Card 
                className={`p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 ${preferences.journaling ? 'border-[#667eea] bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] shadow-lg' : 'border-gray-200 hover:border-[#667eea]/50'}`}
                onClick={() => setPreferences(prev => ({ ...prev, journaling: !prev.journaling }))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#667eea] rounded-2xl flex items-center justify-center">
                      <FileText className="text-white" size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Written Reflection</p>
                      <p className="text-sm text-gray-600">Express your thoughts through words</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.journaling} 
                    onCheckedChange={(checked: boolean) => 
                      setPreferences(prev => ({ ...prev, journaling: checked }))
                    } 
                  />
                </div>
              </Card>

              <Card 
                className={`p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 ${preferences.aiChat ? 'border-[#f093fb] bg-gradient-to-r from-[#fed7e2] to-[#e6f3ff] shadow-lg' : 'border-gray-200 hover:border-[#f093fb]/50'}`}
                onClick={() => setPreferences(prev => ({ ...prev, aiChat: !prev.aiChat }))}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f093fb] rounded-2xl flex items-center justify-center">
                      <MessageCircle className="text-white" size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">AI Chat Support</p>
                      <p className="text-sm text-gray-600">Chat with your wellness companion</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.aiChat} 
                    onCheckedChange={(checked: boolean) => 
                      setPreferences(prev => ({ ...prev, aiChat: checked }))
                    } 
                  />
                </div>
              </Card>
              
            </div>
          </div>
        )
      },
      {
        title: "Choose Your Color Comfort",
        subtitle: "Select the color contrast that feels right for you",
        content: (
          <div className="space-y-8">
            {/* Visual representation */}
            <div className="text-center space-y-3">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-3xl flex items-center justify-center shadow-xl">
                <Sparkles className="text-white" size={32} />
              </div>
              <p className="text-sm text-gray-600">Colors affect our mood and wellbeing. Choose what feels most comfortable for you today.</p>
            </div>
            
            <div className="space-y-4">
              <Card 
                className={`p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 ${colorContrast === 'high' ? 'border-[#5b21b6] shadow-lg' : 'border-gray-200 hover:border-[#5b21b6]/50'}`}
                style={colorContrast === 'high' ? { background: 'linear-gradient(135deg, #5b21b6 0%, #ec4899 100%)' } : {}}
                onClick={() => setColorContrast('high')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                      style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #ec4899 100%)' }}
                    >
                      <Sparkles className="text-white" size={20} />
                    </div>
                    <div>
                      <p className={`font-semibold ${colorContrast === 'high' ? 'text-white' : 'text-gray-900'}`}>High Contrast</p>
                      <p className={`text-sm ${colorContrast === 'high' ? 'text-white/90' : 'text-gray-700'}`}>Bold, vibrant colors for clarity</p>
                    </div>
                  </div>
                  <div 
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={colorContrast === 'high' ? { borderColor: '#667eea', backgroundColor: '#667eea' } : { borderColor: '#d1d5db' }}
                  >
                    {colorContrast === 'high' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>
              </Card>

              <Card 
                className={`p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 ${colorContrast === 'standard' ? 'border-[#667eea] shadow-lg' : 'border-gray-200 hover:border-[#667eea]/50'}`}
                style={colorContrast === 'standard' ? { background: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)' } : {}}
                onClick={() => setColorContrast('standard')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)' }}
                    >
                      <Sparkles className="text-white" size={20} />
                    </div>
                    <div>
                      <p className={`font-semibold ${colorContrast === 'standard' ? 'text-white' : 'text-gray-800'}`}>Standard Contrast</p>
                      <p className={`text-sm ${colorContrast === 'standard' ? 'text-white/90' : 'text-gray-600'}`}>Balanced, comfortable colors</p>
                    </div>
                  </div>
                  <div 
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={colorContrast === 'standard' ? { borderColor: '#667eea', backgroundColor: '#667eea' } : { borderColor: '#d1d5db' }}
                  >
                    {colorContrast === 'standard' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>
              </Card>

              <Card 
                className={`p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 ${colorContrast === 'low' ? 'border-[#a8b3d1] shadow-lg' : 'border-gray-200 hover:border-[#a8b3d1]/50'}`}
                style={colorContrast === 'low' ? { background: 'linear-gradient(135deg, #a8b3d1 0%, #e8b4d6 100%)' } : {}}
                onClick={() => setColorContrast('low')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                      style={{ background: 'linear-gradient(135deg, #a8b3d1 0%, #e8b4d6 100%)' }}
                    >
                      <Sparkles className="text-white" size={20} />
                    </div>
                    <div>
                      <p className={`font-semibold ${colorContrast === 'low' ? 'text-white' : 'text-gray-700'}`}>Low Contrast</p>
                      <p className={`text-sm ${colorContrast === 'low' ? 'text-white/90' : 'text-gray-600'}`}>Soft, soothing colors for calm</p>
                    </div>
                  </div>
                  <div 
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={colorContrast === 'low' ? { borderColor: '#667eea', backgroundColor: '#667eea' } : { borderColor: '#d1d5db' }}
                  >
                    {colorContrast === 'low' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>
              </Card>
              
            </div>
            
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-xs text-blue-800 text-center">
                💡 You can change this anytime from your profile settings
              </p>
            </div>
          </div>
        )
      }
    ];

    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto"
        style={{
          background: `linear-gradient(to bottom right, ${colors.bgGradientFrom}, ${colors.bgGradientTo})`
        }}
      >
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-800">{onboardingScreens[onboardingStep].title}</h1>
            <p className="text-gray-600">{onboardingScreens[onboardingStep].subtitle}</p>
          </div>
          
          {onboardingScreens[onboardingStep].content}
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {onboardingScreens.map((_, index) => (
                <div 
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === onboardingStep ? 'bg-[#667eea]' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            
            <Button 
              onClick={() => {
                if (onboardingStep < onboardingScreens.length - 1) {
                  setOnboardingStep(onboardingStep + 1);
                } else {
                  // Mark onboarding as completed
                  localStorage.setItem('hasCompletedOnboarding', 'true');
                  setCurrentScreen('home');
                }
              }}
              className="bg-[#667eea] hover:bg-[#5a67d8] text-white rounded-full px-6"
            >
              {onboardingStep === onboardingScreens.length - 1 ? 'Get Started' : 'Next'}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen max-w-md mx-auto relative pb-20"
      style={{ backgroundColor: colors.bgGradientFrom }}
    >
      {/* Mood Questionnaire */}
      {currentScreen === 'mood-questionnaire' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setCurrentScreen('home')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowRight className="rotate-180" size={20} />
            </Button>
            <div className="text-center">
              <p className="text-sm text-gray-600">{currentQuestion + 1} of {moodQuestions.length}</p>
              <Progress value={((currentQuestion + 1) / moodQuestions.length) * 100} className="w-24 h-2 mx-auto mt-1" />
            </div>
            <div className="w-10"></div>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-3xl flex items-center justify-center mx-auto">
              <Heart className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Wellness Check-in</h1>
              <p className="text-gray-600">Take a moment to reflect on how you're feeling</p>
            </div>
          </div>

          <Card className="p-6 bg-gradient-to-br from-[#f7fafc] to-[#e6f3ff] border-0 shadow-lg">
            <CardContent className="p-0 space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 text-center leading-relaxed">
                {moodQuestions[currentQuestion]?.question}
              </h3>
              
              <div className="space-y-3">
                {moodQuestions[currentQuestion]?.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => {
                      setMoodAnswers(prev => ({
                        ...prev,
                        [currentQuestion]: option.value
                      }));
                      
                      if (currentQuestion < moodQuestions.length - 1) {
                        setCurrentQuestion(currentQuestion + 1);
                      } else {
                        // Analyze mood and show results
                        const result = analyzeMoodFromQuestionnaire();
                        setCurrentMood([result.mood]);
                        setAnalyzedMood(result);
                        setDailyWellnessCompleted(true);
                        setStreaks(prev => ({ ...prev, mood: prev.mood + 1 }));
                        setCurrentScreen('home');
                        setCurrentQuestion(0);
                        setMoodAnswers({});
                      }
                    }}
                    className={`w-full p-4 text-left rounded-2xl border-2 transition-all duration-200 hover:scale-105 ${
                      moodAnswers[currentQuestion] === option.value
                        ? 'border-[#667eea] bg-[#e6f3ff] text-[#667eea]'
                        : 'border-gray-200 hover:border-[#667eea]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.text}</span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Your responses help us understand and support your wellbeing journey
            </p>
          </div>
        </div>
      )}

      {/* Home Dashboard */}
      {currentScreen === 'home' && (
        <div className="p-6 space-y-6">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{
              background: `linear-gradient(to right, ${colors.bgGradientTo}, ${colors.cardBg})`
            }}>
              <Sparkles style={{ color: colors.primary }} size={18} />
              <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>Day {preferences.journaling ? (streaks.journal + streaks.mood) : streaks.mood}</span>
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent" style={{
              backgroundImage: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              lineHeight: '1.3'
            }}>
              Good morning! ✨
            </h1>
            <p style={{ color: colors.textSecondary }}>How are you feeling today?</p>
          </div>

          {/* Streak Overview */}
          <Card className="p-6 border-0 shadow-lg" style={{
            background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent})`
          }}>
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between text-white">
                <h3 className="font-bold text-lg">Your Wellness Streak</h3>
                <Flame className="text-orange-300" size={24} />
              </div>
              
              <div className={`grid ${preferences.journaling ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                {preferences.journaling && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                      <BookOpen className="text-white" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-white">{streaks.journal}</p>
                    <p className="text-white/80 text-sm">Journal</p>
                  </div>
                )}
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                    <Heart className="text-white" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-white">{streaks.mood}</p>
                  <p className="text-white/80 text-sm">Mood</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                    <Brain className="text-white" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-white">{streaks.meditation}</p>
                  <p className="text-white/80 text-sm">Mindful</p>
                </div>
              </div>

              {getCurrentMilestone(getMaxStreak()) && (
                <div className="bg-white/15 rounded-2xl p-4 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getCurrentMilestone(getMaxStreak())?.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {getCurrentMilestone(getMaxStreak())?.title}
                      </p>
                      <p className="text-white/70 text-sm">Current achievement</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily mood check-in */}
          <Card className="p-6 bg-gradient-to-br from-[#e6f3ff] via-[#fed7e2] to-[#ffecd2] border-0 shadow-lg">
            <CardContent className="p-0 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-lg">Daily Wellness Check</h3>
                <Badge variant="outline" className="border-[#667eea] text-[#667eea] bg-white/50">
                  {dailyWellnessCompleted ? 'Completed' : '+1 Streak'}
                </Badge>
              </div>
              
              {!dailyWellnessCompleted ? (
                <>
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-white/70 rounded-3xl flex items-center justify-center text-4xl shadow-md mx-auto">
                      🌱
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">Let's understand how you're feeling today</p>
                      <p className="text-sm text-gray-600">A few gentle questions to guide your reflection</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setCurrentScreen('mood-questionnaire')}
                    className="w-full text-white rounded-2xl h-12 shadow-lg transform hover:scale-105 transition-all duration-200"
                    style={{
                      background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`
                    }}
                  >
                    <Heart className="mr-2" size={20} />
                    Start Wellness Check
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-white/70 rounded-3xl flex items-center justify-center text-4xl shadow-md mx-auto">
                      {analyzedMood && getMoodEmoji(analyzedMood.mood)}
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">Today's Mood: {analyzedMood && getMoodLabel(analyzedMood.mood)}</p>
                      <p className="text-sm text-gray-600">Wellness check completed ✨</p>
                    </div>
                  </div>
                  
                  {analyzedMood && (
                    <div className="bg-white/70 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="text-[#667eea]" size={16} />
                        <span className="font-semibold text-gray-800 text-sm">AI Analysis</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {analyzedMood.analysis}
                      </p>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => {
                      setDailyWellnessCompleted(false);
                      setAnalyzedMood(null);
                      setCurrentScreen('mood-questionnaire');
                    }}
                    variant="outline"
                    className="w-full border-[#667eea] text-[#667eea] hover:bg-[#e6f3ff] rounded-2xl h-12"
                  >
                    Retake Assessment
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className={`grid ${preferences.journaling && preferences.aiChat ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            {preferences.journaling && (
              <Button 
                onClick={() => setCurrentScreen('new-journal')}
                className="h-28 text-white rounded-3xl flex flex-col gap-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent})`
                }}
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <p className="font-semibold">New Entry</p>
                  <p className="text-xs text-white/80">Express yourself</p>
                </div>
              </Button>
            )}
            {preferences.aiChat && (
              <Button 
                onClick={() => setCurrentScreen('ai-chat')}
                className="h-28 text-white rounded-3xl flex flex-col gap-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.secondary}, ${colors.accent})`
                }}
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <MessageCircle size={24} />
                </div>
                <div className="text-center">
                  <p className="font-semibold">AI Support</p>
                  <p className="text-xs text-white/80">Always here</p>
                </div>
              </Button>
            )}
          </div>

          {/* Weekly mood trend preview */}
          <Card className="p-6 shadow-lg border-0 bg-white">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-lg">This Week's Journey</h3>
                <TrendingUp className="text-[#68d391]" size={20} />
              </div>
              <div className="h-36 bg-gradient-to-br from-[#f7fafc] to-[#e6f3ff] rounded-2xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Line 
                      type="monotone" 
                      dataKey="mood" 
                      stroke="#667eea" 
                      strokeWidth={4}
                      dot={{ r: 6, fill: '#667eea', strokeWidth: 3, stroke: '#ffffff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center">
                {moodData.length >= 2 ? (
                  <Badge className={
                    moodData[moodData.length - 1].mood > moodData[0].mood
                      ? "bg-[#68d391] text-white"
                      : moodData[moodData.length - 1].mood < moodData[0].mood
                      ? "bg-orange-500 text-white"
                      : "bg-blue-500 text-white"
                  }>
                    {moodData[moodData.length - 1].mood > moodData[0].mood
                      ? `+${Math.round(((moodData[moodData.length - 1].mood - moodData[0].mood) / moodData[0].mood) * 100)}% improvement this week`
                      : moodData[moodData.length - 1].mood < moodData[0].mood
                      ? `${Math.round(((moodData[0].mood - moodData[moodData.length - 1].mood) / moodData[0].mood) * 100)}% decrease this week`
                      : "Stable mood this week"
                    }
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500 text-white">
                    Start journaling to track your progress
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Daily supportive message */}
          <Card className="p-6 bg-gradient-to-br from-[#ffecd2] via-[#fcb69f] to-[#ffa07a] border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="text-[#764ba2]" size={24} />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-800">Daily Inspiration</p>
                  <p className="text-gray-700 leading-relaxed">
                    You're doing great today! Remember to be kind to yourself. Every small step counts toward your wellness journey. 💜
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Journal Page - List View */}
      {currentScreen === 'journal' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#f093fb] bg-clip-text text-transparent">
                Journal
              </h1>
              <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-[#667eea] to-[#f093fb] rounded-full">
                <Flame className="text-white" size={14} />
                <span className="text-white text-sm font-semibold">{streaks.journal}</span>
              </div>
            </div>
            
            <Button
              onClick={() => setCurrentScreen('new-journal')}
              className="w-12 h-12 bg-gradient-to-br from-[#667eea] to-[#f093fb] hover:from-[#5a67d8] hover:to-[#e879f9] text-white rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Plus size={20} />
            </Button>
          </div>

          <div className="text-center p-4 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-2xl">
            <p className="text-[#667eea] font-semibold">
              💭 Your sacred space for thoughts and reflections
            </p>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-4">
            {isLoadingJournals ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading your journal entries...</p>
              </div>
            ) : (
              journalEntries.map((entry) => (
                <Card key={entry._id} className="p-5 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                  <CardContent className="p-0 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-800">{entry.title}</h3>
                          <div className="text-xl">
                            {(entry as any).mlAnalysis?.primary_emotion 
                              ? getEmotionEmoji((entry as any).mlAnalysis.primary_emotion)
                              : entry.mood === 'very-happy' ? '😄' : 
                                entry.mood === 'happy' ? '🙂' : 
                                entry.mood === 'neutral' ? '😐' : 
                                entry.mood === 'sad' ? '😔' :
                                entry.mood === 'very-sad' ? '😢' :
                                entry.mood === 'anxious' ? '😰' :
                                entry.mood === 'calm' ? '😌' :
                                entry.mood === 'stressed' ? '😫' : '�'
                            }
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                          {entry.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this journal entry?')) {
                            deleteJournalEntry(entry._id);
                          }
                        }}
                        className="flex-shrink-0 hover:bg-red-50 hover:text-red-600 ml-2"
                      >
                        <Trash2 className="text-gray-400 hover:text-red-600" size={18} />
                      </Button>
                    </div>
                    
                    {/* Expanded Details */}
                    {expandedEntryId === entry._id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in slide-in-from-top duration-200">
                        {/* Full Content */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Full Entry</h4>
                          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </div>

                        {/* ML Analysis Details */}
                        {(entry as any).mlAnalysis && (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
                            <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                              <Brain size={16} />
                              AI Emotion Analysis
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Primary Emotion:</span>
                                <span className="font-semibold text-purple-700 capitalize">
                                  {(entry as any).mlAnalysis.primary_emotion}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Confidence:</span>
                                <span className="font-semibold text-purple-700">
                                  {Math.round((entry as any).mlAnalysis.emotion_confidence * 100)}%
                                </span>
                              </div>
                              {(entry as any).mlAnalysis.emotional_state_summary && (
                                <div className="pt-2 border-t border-purple-200">
                                  <span className="text-gray-600">Summary: </span>
                                  <span className="text-purple-700">{(entry as any).mlAnalysis.emotional_state_summary}</span>
                                </div>
                              )}
                              {(entry as any).mlAnalysis.detected_emotions?.length > 0 && (
                                <div className="pt-2">
                                  <span className="text-gray-600 block mb-2">All Detected Emotions:</span>
                                  <div className="space-y-1">
                                    {(entry as any).mlAnalysis.detected_emotions.map((emotion: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center">
                                        <span className="text-purple-600 capitalize text-xs">{emotion.emotion}</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-24 h-2 bg-purple-200 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-purple-500 rounded-full" 
                                              style={{ width: `${emotion.score * 100}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-gray-600 w-12 text-right">
                                            {Math.round(emotion.score * 100)}%
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Keystroke Analysis */}
                        {(entry as any).keystrokeData && (
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl">
                            <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                              ⌨️ Typing Behavior Analysis
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {(entry as any).keystrokeData.total_keystrokes && (
                                <div>
                                  <span className="text-gray-600">Total Keystrokes:</span>
                                  <p className="font-semibold text-blue-700">{(entry as any).keystrokeData.total_keystrokes}</p>
                                </div>
                              )}
                              {(entry as any).keystrokeData.typing_duration && (
                                <div>
                                  <span className="text-gray-600">Duration:</span>
                                  <p className="font-semibold text-blue-700">{Math.round((entry as any).keystrokeData.typing_duration)} seconds</p>
                                </div>
                              )}
                              {(entry as any).keystrokeData.avg_wpm && (
                                <div>
                                  <span className="text-gray-600">Typing Speed:</span>
                                  <p className="font-semibold text-blue-700">{(entry as any).keystrokeData.avg_wpm} WPM</p>
                                </div>
                              )}
                              {(entry as any).keystrokeData.pause_count !== undefined && (
                                <div>
                                  <span className="text-gray-600">Pauses:</span>
                                  <p className="font-semibold text-blue-700">{(entry as any).keystrokeData.pause_count}</p>
                                </div>
                              )}
                              {(entry as any).keystrokeData.error_rate !== undefined && (
                                <div>
                                  <span className="text-gray-600">Error Rate:</span>
                                  <p className="font-semibold text-blue-700">{(entry as any).keystrokeData.error_rate}%</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {entry.tags?.map((tag: string) => (
                              <Badge key={tag} className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
                          <div className="flex justify-between">
                            <span>Created: {new Date(entry.createdAt).toLocaleString()}</span>
                            <span>{entry.isPrivate ? '🔒 Private' : '🌍 Public'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Collapsed View - Tags and Date with Expand Button */}
                    {expandedEntryId !== entry._id && (
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap items-center">
                          {entry.tags?.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs border-[#667eea]/30 text-[#667eea]">
                              {tag}
                            </Badge>
                          ))}
                          {entry.tags && entry.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">
                              +{entry.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setExpandedEntryId(entry._id);
                            }}
                            className="h-6 w-6 p-0 hover:bg-purple-50 rounded-full transition-all duration-200"
                          >
                            <ChevronDown 
                              className="text-purple-600 transition-all duration-300 ease-in-out hover:scale-110" 
                              size={16} 
                            />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Expanded View - Collapse Button */}
                    {expandedEntryId === entry._id && (
                      <div className="flex items-center justify-center pt-2 border-t border-gray-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setExpandedEntryId(null);
                          }}
                          className="h-8 hover:bg-purple-50 rounded-full transition-all duration-200 flex items-center gap-2"
                        >
                          <span className="text-xs text-purple-600 font-medium">Show less</span>
                          <ChevronDown 
                            className="text-purple-600 transition-all duration-300 ease-in-out rotate-180 hover:scale-110" 
                            size={16} 
                          />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {journalEntries.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] rounded-3xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-[#667eea]" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Start Your Journey</h3>
              <p className="text-gray-600 mb-6">Your first journal entry awaits. Share what's on your heart.</p>
              <Button
                onClick={() => setCurrentScreen('new-journal')}
                className="bg-gradient-to-r from-[#667eea] to-[#f093fb] hover:from-[#5a67d8] hover:to-[#e879f9] text-white rounded-2xl px-6"
              >
                <Plus size={16} className="mr-2" />
                Write First Entry
              </Button>
            </div>
          )}
        </div>
      )}

      {/* New Journal Entry Page */}
      {currentScreen === 'new-journal' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setCurrentScreen('journal')}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowRight className="rotate-180" size={20} />
            </Button>
            <h1 className="text-xl font-bold text-gray-800">New Entry</h1>
            <div className="w-10"></div>
          </div>

          <div className="p-4 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-2xl">
            <p className="text-[#667eea] font-semibold">
              💭 {dailyPrompts[Math.floor(Math.random() * dailyPrompts.length)]}
            </p>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Give your entry a title..."
              value={journalTitle}
              onChange={(e) => setJournalTitle(e.target.value)}
              className="bg-white border-0 rounded-2xl h-12 shadow-lg text-lg font-medium placeholder:text-gray-400"
            />
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-2xl border border-purple-200">
              <p className="text-sm text-purple-700 flex items-center gap-2">
                <Brain size={16} />
                <span>AI will detect your emotion from your writing...</span>
              </p>
            </div>
            
            <div className="relative">
              <Textarea
                placeholder="What's on your mind today? Share your thoughts, feelings, or experiences... ✨"
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                className="min-h-80 bg-white border-0 rounded-3xl resize-none text-base p-6 shadow-lg placeholder:text-gray-400"
              />
              {!journalText && (
                <div className="absolute top-20 left-8 right-8 text-center text-gray-400 pointer-events-none">
                  <p className="text-sm">This is your safe space...</p>
                  <p className="text-xs mt-1">Express yourself freely 🔒</p>
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={async () => {
              if (journalText.trim() && journalTitle.trim()) {
                try {
                  // Get keystroke metrics
                  const keystrokeMetrics = getMetrics();
                  
                  await createJournalEntry({
                    title: journalTitle,
                    content: journalText,
                    tags: ['reflection'],
                    isPrivate: true,
                    keystrokeData: keystrokeMetrics || undefined
                  });
                  
                  // Reset form
                  setJournalText('');
                  setJournalTitle('');
                  resetKeystrokes();
                  
                  // Streak will be recalculated when entries are fetched
                  setCurrentScreen('journal');
                } catch (error) {
                  // Error already handled in createJournalEntry
                }
              } else {
                alert('Please add both a title and content to your journal entry.');
              }
            }}
            className="w-full bg-gradient-to-r from-[#667eea] to-[#5a67d8] hover:from-[#5a67d8] hover:to-[#4c51bf] text-white rounded-2xl h-14 shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <FileText size={20} className="mr-2" />
            <div className="text-left">
              <p className="font-semibold">Save Entry with AI Analysis</p>
              <p className="text-xs text-white/80">+1 streak day</p>
            </div>
          </Button>

          {journalText && (
            <Card className="p-5 bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] border-0 shadow-lg">
              <CardContent className="p-0 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/50 rounded-xl flex items-center justify-center">
                    <Sparkles className="text-[#667eea]" size={16} />
                  </div>
                  <span className="font-semibold text-gray-800">AI Insights</span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  I can sense the thoughtfulness in your words. Your willingness to reflect shows real emotional wisdom. Consider what emotions are most present as you write - they often hold important messages for your growth.
                </p>
                <div className="flex gap-2 pt-2">
                  <Badge variant="outline" className="text-xs border-[#667eea] text-[#667eea]">
                    Self-awareness
                  </Badge>
                  <Badge variant="outline" className="text-xs border-[#f093fb] text-[#f093fb]">
                    Emotional processing
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Insights Page */}
      {currentScreen === 'insights' && (
        <div className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent" style={{
              backgroundImage: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text'
            }}>
              Insights
            </h1>
            <p style={{ color: colors.textSecondary }}>Your mental wellness patterns</p>
          </div>

          {/* Streak Progress & Achievements */}
          <Card className="p-6 border-0 shadow-lg" style={{
            background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent})`
          }}>
            <CardContent className="p-0 space-y-5">
              <div className="flex items-center justify-between text-white">
                <h3 className="font-bold text-lg">Streak Achievements</h3>
                <Award className="text-yellow-300" size={24} />
              </div>
              
              <div className="space-y-4">
                {/* Current milestone */}
                {getCurrentMilestone(getMaxStreak()) && (
                  <div className="bg-white/15 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">
                        {getCurrentMilestone(getMaxStreak())?.icon}
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">
                          {getCurrentMilestone(getMaxStreak())?.title}
                        </p>
                        <p className="text-white/70">Current achievement unlocked!</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next milestone progress */}
                {getNextMilestone(getMaxStreak()) && (
                  <div className="bg-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="text-white" size={16} />
                        <span className="text-white font-medium">Next Goal</span>
                      </div>
                      <span className="text-white text-sm">
                        {getMaxStreak()}/{getNextMilestone(getMaxStreak())?.days}
                      </span>
                    </div>
                    <Progress 
                      value={(getMaxStreak() / (getNextMilestone(getMaxStreak())?.days || 1)) * 100} 
                      className="mb-2 [&>div]:bg-gradient-to-r [&>div]:from-[#667eea] [&>div]:to-[#f093fb]"
                    />
                    <p className="text-white/80 text-sm">
                      {(getNextMilestone(getMaxStreak())?.days || 0) - getMaxStreak()} days to {getNextMilestone(getMaxStreak())?.title}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Streak Stats */}
          <Card className="p-6 shadow-lg border-0">
            <CardContent className="p-0 space-y-5">
              <h3 className="font-bold text-gray-800 text-lg">Streak Statistics</h3>
              
              <div className="space-y-4">
                {preferences.journaling && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#e6f3ff] to-[#f7fafc] rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#667eea] rounded-xl flex items-center justify-center">
                        <BookOpen className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Journal Streak</p>
                        <p className="text-sm text-gray-600">Daily reflection</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#667eea]">{streaks.journal}</p>
                      <p className="text-xs text-gray-500">days</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#fed7e2] to-[#f7fafc] rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f093fb] rounded-xl flex items-center justify-center">
                      <Heart className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Mood Tracking</p>
                      <p className="text-sm text-gray-600">Daily check-ins</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#f093fb]">{streaks.mood}</p>
                    <p className="text-xs text-gray-500">days</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#ffecd2] to-[#f7fafc] rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#764ba2] rounded-xl flex items-center justify-center">
                      <Brain className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Mindfulness</p>
                      <p className="text-sm text-gray-600">Practice sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#764ba2]">{streaks.meditation}</p>
                    <p className="text-xs text-gray-500">days</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood trends */}
          <Card className="p-6 shadow-lg border-0">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-lg">Mood Trends (Last 7 Days)</h3>
                <Badge className={
                  moodData.length >= 2 && moodData[moodData.length - 1].mood > moodData[0].mood
                    ? "bg-[#68d391] text-white"
                    : moodData.length >= 2 && moodData[moodData.length - 1].mood < moodData[0].mood
                    ? "bg-orange-500 text-white"
                    : "bg-blue-500 text-white"
                }>
                  {moodData.length >= 2 
                    ? moodData[moodData.length - 1].mood > moodData[0].mood
                      ? "Improving"
                      : moodData[moodData.length - 1].mood < moodData[0].mood
                      ? "Declining"
                      : "Stable"
                    : "Tracking"
                  }
                </Badge>
              </div>
              <div className="h-52 bg-gradient-to-br from-[#f7fafc] to-[#e6f3ff] rounded-2xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} hide />
                    <Line 
                      type="monotone" 
                      dataKey="mood" 
                      stroke="#667eea" 
                      strokeWidth={4}
                      dot={{ r: 6, fill: '#667eea', strokeWidth: 3, stroke: '#ffffff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Emotion breakdown */}
          <Card className="p-6 shadow-lg border-0">
            <CardContent className="p-0 space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">Emotion Analysis</h3>
              <div className="h-52 bg-gradient-to-br from-[#f7fafc] to-[#fed7e2] rounded-2xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emotionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {emotionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {emotionData.map((emotion) => (
                  <div key={emotion.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ backgroundColor: emotion.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{emotion.name} {emotion.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly forecast */}
          <Card className="p-6 bg-gradient-to-br from-[#e6f3ff] via-[#fed7e2] to-[#ffecd2] border-0 shadow-lg">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/50 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="text-[#667eea]" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Mood Forecast</h3>
                  <p className="text-gray-600 text-sm">AI-powered prediction</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {journalEntries.length === 0 
                  ? "Start journaling to see personalized insights and mood predictions based on your emotional patterns."
                  : dominantEmotion === null
                  ? "Keep journaling to build a comprehensive emotional profile. We'll provide personalized insights as you track more entries."
                  : positivityScore >= 70
                  ? `Your emotional landscape is flourishing! ${getEmotionEmoji(dominantEmotion)} You're experiencing predominantly ${dominantEmotion} emotions. Your consistent journaling is creating positive momentum. Keep nurturing your mental wellness!`
                  : positivityScore >= 50
                  ? `You're maintaining a balanced emotional state with ${dominantEmotion} ${getEmotionEmoji(dominantEmotion)} as your current mood tendency. Continue your self-care practices and be mindful of your emotional needs.`
                  : positivityScore >= 30
                  ? `Your recent entries show some emotional challenges with ${dominantEmotion} ${getEmotionEmoji(dominantEmotion)} emerging as a pattern. This is okay - remember to be kind to yourself. Consider reaching out to supportive friends or our AI companion.`
                  : `You seem to be going through a difficult time with recurring ${dominantEmotion} ${getEmotionEmoji(dominantEmotion)} feelings. Your feelings are valid. Please consider talking to a mental health professional or using our AI support for guidance.`
                }
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Positivity Score</span>
                  <span className={`text-sm font-bold ${
                    positivityScore >= 70 ? 'text-[#68d391]' : 
                    positivityScore >= 50 ? 'text-blue-500' : 
                    positivityScore >= 30 ? 'text-orange-500' : 'text-red-500'
                  }`}>
                    {positivityScore}%
                  </span>
                </div>
                <Progress 
                  value={positivityScore} 
                  className={`h-3 [&>div]:bg-gradient-to-r ${
                    positivityScore >= 70 ? '[&>div]:from-[#68d391] [&>div]:to-[#667eea]' : 
                    positivityScore >= 50 ? '[&>div]:from-blue-400 [&>div]:to-blue-600' : 
                    positivityScore >= 30 ? '[&>div]:from-orange-400 [&>div]:to-orange-600' : '[&>div]:from-red-400 [&>div]:to-red-600'
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Therapist Chat */}
      {currentScreen === 'ai-chat' && (
        <div className="flex flex-col h-screen max-h-screen">
          <div className="p-6 border-b bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-[#667eea] to-[#f093fb] text-white">
                      <Brain size={20} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="font-bold text-gray-800">Compassionate AI</h1>
                  <p className="text-sm text-gray-600">Your empathetic wellness companion</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  fetchChatSessions();
                  setShowChatHistory(true);
                }}
                className="flex items-center gap-2"
              >
                <History size={20} />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-4 overflow-y-auto pb-48">
            {chatMessages.map((message, index) => (
              <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {message.role === 'ai' && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-[#667eea] to-[#f093fb] text-white text-xs">
                      <Brain size={12} />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] p-4 rounded-3xl shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-[#667eea] to-[#5a67d8] text-white' 
                    : 'bg-white border border-gray-100 text-gray-800'
                }`}>
                  <p className="leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Suggested Prompts */}
          {chatMessages.length <= 1 && (
            <div className="p-4 bg-gray-50 border-t">
              <p className="text-sm font-medium text-gray-700 mb-3">Try asking about:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.slice(0, 3).map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => sendMessage(prompt)}
                    className="text-xs rounded-full border-[#667eea]/30 text-[#667eea] hover:bg-[#e6f3ff] h-8"
                  >
                    <Lightbulb size={12} className="mr-1" />
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="fixed bottom-20 left-0 right-0 bg-white border-t max-w-md mx-auto">
            {/* Additional suggested prompts */}
            <div className="p-4 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {suggestedPrompts.slice(3).map((prompt, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => sendMessage(prompt)}
                    className="text-xs rounded-full bg-[#e6f3ff] text-[#667eea] hover:bg-[#d6e8ff] whitespace-nowrap h-8 flex-shrink-0"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 p-4 pt-2">
              <Input
                placeholder="Share what's on your heart..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 rounded-2xl border-gray-200 h-12 bg-gray-50"
              />
              <Button 
                onClick={() => sendMessage()}
                disabled={!newMessage.trim()}
                className="bg-gradient-to-r from-[#667eea] to-[#f093fb] hover:from-[#5a67d8] hover:to-[#e879f9] text-white rounded-2xl w-12 h-12 p-0 shadow-lg"
              >
                <Send size={20} />
              </Button>
            </div>
          </div>

          {/* Chat History Overlay - Full width, stops at bottom nav */}
          {showChatHistory && (
            <div 
              style={{
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '80px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px'
              }}
              onClick={() => setShowChatHistory(false)}
            >
              <div 
                style={{
                  backgroundColor: 'white',
                  width: '100%',
                  maxWidth: '95%',
                  height: '100%',
                  maxHeight: '100%',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
                  <h2 className="text-xl font-bold text-gray-800">Chat History</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChatHistory(false)}
                    className="p-2"
                  >
                    <X size={20} />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
                  {chatSessions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="text-[#667eea]" size={32} />
                      </div>
                      <p className="text-gray-600">No previous chats yet</p>
                      <p className="text-sm text-gray-500 mt-2">Start a conversation to see your chat history</p>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <Card
                        key={session.sessionId}
                        className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200"
                        onClick={() => {
                          setCurrentSessionId(session.sessionId);
                          loadChatSession(session.sessionId);
                          setShowChatHistory(false);
                        }}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800">{session.title}</h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(session.lastMessageAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <ChevronRight className="text-gray-400" size={18} />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                <div className="p-6 border-t">
                  <Button
                    onClick={() => {
                      setCurrentSessionId(null);
                      setChatMessages([{ role: 'ai', content: "Hello! I'm your wellness companion. How are you feeling today?" }]);
                      setShowChatHistory(false);
                      createChatSession();
                    }}
                    className="w-full bg-gradient-to-r from-[#667eea] to-[#f093fb] hover:from-[#5a67d8] hover:to-[#e879f9] text-white rounded-2xl h-12"
                  >
                    <Plus size={18} className="mr-2" />
                    Start New Chat
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile & Settings */}
      {currentScreen === 'profile' && (
        <div className="p-6 space-y-6">
          <div className="text-center space-y-4">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarImage src="" />
              <AvatarFallback className="bg-[#667eea] text-white text-2xl">
                {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{currentUser?.name || 'User'}</h1>
              <p className="text-gray-600">{currentUser?.email || ''}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="text-[#667eea]" size={24} />
                  <div>
                    <p className="font-medium">Journaling Reminders</p>
                    <p className="text-sm text-gray-600">Daily at 9:00 PM</p>
                  </div>
                </div>
                <Switch checked={true} onCheckedChange={() => {}} />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-[#667eea]" size={24} />
                  <div>
                    <p className="font-medium">Journal Entry</p>
                    <p className="text-sm text-gray-600">Enable daily journaling feature</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.journaling} 
                  onCheckedChange={(checked: boolean) => 
                    setPreferences(prev => ({ ...prev, journaling: checked }))
                  } 
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="text-[#f093fb]" size={24} />
                  <div>
                    <p className="font-medium">AI Chat Support</p>
                    <p className="text-sm text-gray-600">Enable wellness companion chat</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.aiChat} 
                  onCheckedChange={(checked: boolean) => 
                    setPreferences(prev => ({ ...prev, aiChat: checked }))
                  } 
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-[#764ba2]" size={24} />
                  <div>
                    <p className="font-medium">Color Contrast</p>
                    <p className="text-sm text-gray-600">Adjust colors for your comfort</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setColorContrast('high')}
                    className="text-xs rounded-xl h-16 flex flex-col gap-1"
                    style={{
                      borderWidth: colorContrast === 'high' ? '2px' : '1px',
                      borderColor: colorContrast === 'high' ? '#5b21b6' : '#e5e7eb',
                      backgroundColor: colorContrast === 'high' ? '#f0f9ff' : 'white',
                      color: colorContrast === 'high' ? '#5b21b6' : '#6b7280'
                    }}
                  >
                    <div className="w-6 h-6 bg-[#5b21b6] rounded-lg"></div>
                    <span className="font-medium">High</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setColorContrast('standard')}
                    className="text-xs rounded-xl h-16 flex flex-col gap-1"
                    style={{
                      borderWidth: colorContrast === 'standard' ? '2px' : '1px',
                      borderColor: colorContrast === 'standard' ? '#667eea' : '#e5e7eb',
                      backgroundColor: colorContrast === 'standard' ? '#e6f3ff' : 'white',
                      color: colorContrast === 'standard' ? '#667eea' : '#6b7280'
                    }}
                  >
                    <div className="w-6 h-6 bg-[#667eea] rounded-lg"></div>
                    <span className="font-medium">Standard</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setColorContrast('low')}
                    className="text-xs rounded-xl h-16 flex flex-col gap-1"
                    style={{
                      borderWidth: colorContrast === 'low' ? '2px' : '1px',
                      borderColor: colorContrast === 'low' ? '#a8b3d1' : '#e5e7eb',
                      backgroundColor: colorContrast === 'low' ? '#fdfcfd' : 'white',
                      color: colorContrast === 'low' ? '#4a4d5a' : '#6b7280'
                    }}
                  >
                    <div className="w-6 h-6 bg-[#a8b3d1] rounded-lg"></div>
                    <span className="font-medium">Low</span>
                  </Button>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setCurrentScreen('privacy')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="text-black" size={24} />
                  <div>
                    <p className="font-medium">Privacy & Data</p>
                    <p className="text-sm text-gray-600">Manage your data</p>
                  </div>
                </div>
                <ArrowRight className="text-gray-400" size={20} />
              </div>
            </Card>


          </div>

          <div className="pt-8">
            <Button 
              variant="outline" 
              className="w-full rounded-2xl border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Privacy & Data Screen */}
      {currentScreen === 'privacy' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentScreen('profile')}
              className="text-gray-600 hover:text-gray-800"
            >
              <ChevronRight className="rotate-180" size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Privacy & Data</h1>
          </div>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">Your Data</h2>
              <p className="text-sm text-gray-600">
                Your privacy is important to us. All your data is stored securely and is only accessible to you.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">What we store:</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Your profile information (name, email)</li>
                <li>Journal entries and mood tracking data</li>
                <li>AI chat conversations</li>
                <li>App preferences and settings</li>
              </ul>
            </div>
          </Card>

          <Card className="p-6 space-y-4 border-red-200">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <Shield size={20} />
                Delete Account
              </h2>
              <p className="text-sm text-gray-600">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>

            <Button 
              className="w-full rounded-2xl !bg-red-600 hover:!bg-red-700 !text-white font-semibold"
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.')) {
                  try {
                    const { authService } = await import('./services/api.service');
                    await authService.deleteAccount();
                    alert('Your account has been deleted successfully.');
                    setCurrentUser(null);
                    setCurrentScreen('login');
                  } catch (error: any) {
                    alert(error.response?.data?.message || 'Failed to delete account. Please try again.');
                  }
                }
              }}
            >
              Delete My Account and Data
            </Button>
          </Card>
        </div>
      )}

      <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} preferences={preferences} />
    </div>
  );
};

export default MentalHealthApp;