import React, { useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Progress } from "./components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
import { Switch } from "./components/ui/switch";
import { useKeystrokeCapture } from "./hooks/useKeystrokeCapture";
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
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { LoginScreen } from "./components/LoginScreen";
import { BottomNav } from "./components/BottomNav";
import { LocalNotifications } from "@capacitor/local-notifications";

type Screen =
  | "login"
  | "onboarding"
  | "home"
  | "journal"
  | "new-journal"
  | "mood-questionnaire"
  | "insights"
  | "ai-chat"
  | "chat-history"
  | "profile"
  | "privacy";

interface MoodEntry {
  date: string;
  mood: number | null;
  emotion: string | null;
}

interface EmotionData {
  name: string;
  value: number;
  color: string;
}

const MentalHealthApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [currentMood, setCurrentMood] = useState([7]);
  const [journalText, setJournalText] = useState("");
  const [journalTitle, setJournalTitle] = useState("");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [preferences, setPreferences] = useState({
    journaling: true,
    aiChat: true,
    notifications: true,
    notificationTime: "21:00", // 9:00 PM default
  });
  const [colorContrast, setColorContrast] = useState<
    "standard" | "high" | "low"
  >(() => {
    const saved = localStorage.getItem("colorContrast");
    return saved === "high" || saved === "low" || saved === "standard"
      ? saved
      : "standard";
  });
  const [currentUser, setCurrentUser] = useState<{
    _id: string;
    name: string;
    email: string;
  } | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDeletingJournal, setIsDeletingJournal] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  // Touch handling for swipe gestures (used in onboarding)
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Add these functions after your state declarations
  const scheduleNotification = async (time: string) => {
    try {
      const permissionResult = await LocalNotifications.requestPermissions();

      if (permissionResult.display !== "granted") {
        console.log("Notification permission denied");
        return false;
      }

      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

      const [hours, minutes] = time.split(":").map(Number);
      const notificationTime = new Date();
      notificationTime.setHours(hours, minutes, 0, 0);

      if (notificationTime <= new Date()) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Time to reflect! 🌟",
            body: "Take a moment to journal about your day and check in with yourself.",
            id: 1,
            schedule: {
              at: notificationTime,
              every: "day",
            },
            sound: "default",
            attachments: undefined,
            actionTypeId: "",
            extra: null,
          },
        ],
      });

      console.log(
        `Notification scheduled for ${notificationTime.toLocaleString()}`
      );
      return true;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return false;
    }
  };

  const cancelNotification = async () => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      console.log("Notification canceled");
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  };

  // Keystroke capture for ML analysis
  const {
    handleKeyDown,
    handleKeyUp,
    getMetrics,
    reset: resetKeystrokes,
  } = useKeystrokeCapture();

  // Persist color contrast to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("colorContrast", colorContrast);
  }, [colorContrast]);

  // Check for existing authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const hasCompletedOnboarding = localStorage.getItem(
      "hasCompletedOnboarding"
    );

    console.log("App mounted - checking authentication", {
      hasToken: !!token,
      hasUser: !!user,
      hasCompletedOnboarding,
    });

    // Only proceed to app if we have valid token and user data
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (userData && userData._id) {
          console.log("Valid user found in localStorage");
          setCurrentUser(userData);
          // Check if user has completed onboarding before
          if (hasCompletedOnboarding === "true") {
            console.log("User has completed onboarding, going to home");
            setCurrentScreen("home");
          } else {
            console.log(
              "User has not completed onboarding, showing onboarding"
            );
            setCurrentScreen("onboarding");
          }
        } else {
          console.log("Invalid user data, clearing localStorage");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("hasCompletedOnboarding");
          setCurrentScreen("login");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("hasCompletedOnboarding");
        setCurrentScreen("login");
      }
    } else {
      console.log("No authentication found, showing login screen");
      setCurrentScreen("login");
    }

    // Initialization complete
    setIsInitializing(false);
  }, []);

  // Close expanded journal entries when navigating away from journal screen
  useEffect(() => {
    if (currentScreen !== "journal") {
      setExpandedEntryId(null);
    }
  }, [currentScreen]);

  // Sign out handler
  const handleSignOut = () => {
    console.log("Signing out...");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("hasCompletedOnboarding");
    setCurrentUser(null);
    setCurrentScreen("login");

    // Clear all user-specific data
    setJournalEntries([]);
    setChatMessages([
      {
        role: "ai",
        content:
          "Hello! I'm your wellness companion. How are you feeling today?",
      },
    ]);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null; // Clear ref
    hasInitializedData.current = false; // Reset initialization flag
    hasLoadedJournals.current = false; // Reset journal load flag
    setChatSessions([]);
    setShowChatHistory(false);
    setStreaks({
      journal: 0,
      mood: 0,
      meditation: 0,
      totalDays: 0,
      totalEntries: 0,
    });
    setJournalText("");
    setJournalTitle("");
    resetKeystrokes();
  };

  // Redirect from disabled screens
  useEffect(() => {
    if (currentScreen === "journal" && !preferences.journaling) {
      setCurrentScreen("home");
    }
    if (currentScreen === "ai-chat" && !preferences.aiChat) {
      setCurrentScreen("home");
    }
  }, [currentScreen, preferences]);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "ai",
      content: "Hello! I'm your wellness companion. How are you feeling today?",
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [moodAnswers, setMoodAnswers] = useState<{ [key: string]: string }>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [dailyWellnessCompleted, setDailyWellnessCompleted] = useState(false);
  const [analyzedMood, setAnalyzedMood] = useState<{
    mood: number;
    analysis: string;
  } | null>(null);

  // Ref for auto-scrolling chat messages
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Streak tracking state
  const [streaks, setStreaks] = useState({
    journal: 0, // Consecutive days streak (for "Day X" at top and Streak Master achievement)
    mood: 0,
    meditation: 0,
    totalDays: 0, // Total unique days with entries
    totalEntries: 0, // Total number of journal entries (for counters)
  });

  // Journal entries state
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [isLoadingJournals, setIsLoadingJournals] = useState(false);

  // API Configuration - Use environment variable
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

  // Axios instance with auth token
  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  };

  // Helper function to get emoji for emotion
  const getEmotionEmoji = (emotion: string): string => {
    const emojiMap: { [key: string]: string } = {
      anger: "😠",
      annoyance: "😤",
      joy: "😊",
      happiness: "😄",
      sadness: "😢",
      fear: "😨",
      anxiety: "😰",
      nervousness: "😟",
      love: "❤️",
      excitement: "🤩",
      surprise: "😲",
      disgust: "🤢",
      confusion: "😕",
      disappointment: "😞",
      embarrassment: "😳",
      gratitude: "🙏",
      grief: "😭",
      optimism: "🌟",
      pride: "😌",
      relief: "😌",
      remorse: "😔",
      admiration: "😍",
      amusement: "😄",
      approval: "👍",
      caring: "🤗",
      curiosity: "🤔",
      desire: "😍",
      disapproval: "👎",
      realization: "💡",
      neutral: "😐",
    };
    return emojiMap[emotion.toLowerCase()] || "😐";
  };

  // Calculate real emotion data from journal entries
  const getEmotionBreakdown = () => {
    if (!journalEntries || journalEntries.length === 0) {
      return [{ name: "No data yet", value: 100, color: "#E5E7EB" }];
    }

    const emotionCounts: { [key: string]: number } = {};
    const emotionColors: { [key: string]: string } = {
      anger: "#EF4444",
      joy: "#10B981",
      sadness: "#3B82F6",
      fear: "#8B5CF6",
      love: "#EC4899",
      excitement: "#F59E0B",
      gratitude: "#14B8A6",
      neutral: "#9CA3AF",
      optimism: "#84CC16",
      disappointment: "#F97316",
      nervousness: "#A855F7",
      caring: "#06B6D4",
      admiration: "#6366F1",
      amusement: "#F472B6",
      annoyance: "#FB923C",
      approval: "#22C55E",
      confusion: "#A78BFA",
      curiosity: "#60A5FA",
      desire: "#F43F5E",
      disgust: "#84CC16",
      embarrassment: "#FCA5A5",
      grief: "#475569",
      pride: "#FBBF24",
      realization: "#38BDF8",
      relief: "#86EFAC",
      remorse: "#94A3B8",
      surprise: "#FCD34D",
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

    // If no emotions were detected, return placeholder
    if (total === 0) {
      return [{ name: "Analyzing...", value: 100, color: "#E5E7EB" }];
    }

    const emotionData = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        value: Math.round((count / total) * 100),
        color: emotionColors[emotion] || "#6B7280",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 emotions

    return emotionData;
  };

  // Get mood trend data from current week (Sunday to Saturday) with daily averages
  // Updated getMoodTrendData function - uses emotion scores and sums them

  // Updated getMoodTrendData function - uses emotion scores and sums them
  const getMoodTrendData = () => {
    // Convert emotions to mood scores (1-10)
    const emotionToScore: { [key: string]: number } = {
      // Very positive emotions
      joy: 10,
      excitement: 9,
      love: 9,
      gratitude: 8,
      optimism: 7,
      amusement: 7,
      admiration: 7,
      pride: 7,

      // Mildly positive
      relief: 5,
      caring: 6,

      // Neutral
      neutral: 0,
      curiosity: 2,
      surprise: 1,

      // Mildly negative
      confusion: -2,
      nervousness: -3,
      disappointment: -4,

      // Very negative
      sadness: -6,
      fear: -7,
      anger: -8,
      grief: -9,
      disgust: -5,
    };

    // Get current week's Sunday
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc...
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - currentDay,
      0,
      0,
      0,
      0
    );
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7); // Next Sunday

    // Create array for all 7 days of current week
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekData: {
      [key: string]: {
        totalScore: number; // Sum of all emotion scores
        count: number; // Number of entries
        emotions: string[];
        hasData: boolean;
      };
    } = {};

    // Initialize all days
    weekDays.forEach((day) => {
      weekData[day] = { totalScore: 0, count: 0, emotions: [], hasData: false };
    });

    // Filter entries from current week and group by day
    journalEntries.forEach((entry: any) => {
      const entryDate = new Date(entry.createdAt);
      // Normalize to local midnight for comparison
      const entryDateNormalized = new Date(
        entryDate.getFullYear(),
        entryDate.getMonth(),
        entryDate.getDate(),
        0,
        0,
        0,
        0
      );

      // Check if entry is in current week (Sunday to Saturday)
      if (entryDateNormalized >= weekStart && entryDateNormalized < weekEnd) {
        // Get day of week (0=Sun, 1=Mon, etc.) directly
        const dayOfWeek = entryDate.getDay();
        const dayName = weekDays[dayOfWeek];
        const emotion = entry.mlAnalysis?.primary_emotion || "neutral";
        const score = emotionToScore[emotion] || 0;

        // Sum the emotion scores
        weekData[dayName].totalScore += score;
        weekData[dayName].count += 1;
        weekData[dayName].emotions.push(emotion);
        weekData[dayName].hasData = true;
      }
    });

    // Calculate daily totals - keep all days to show proper labels on chart
    const result = weekDays.map((day) => {
      const dayData = weekData[day];

      if (!dayData.hasData) {
        // Return day with null mood so chart shows label but no data point
        return { date: day, mood: null, emotion: null };
      }

      // Return the TOTAL score (sum of all emotion scores for that day)
      const totalScore = dayData.totalScore;

      // Get most common emotion for the day
      const emotionCounts: { [key: string]: number } = {};
      dayData.emotions.forEach((emotion) => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
      const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
        emotionCounts[a] > emotionCounts[b] ? a : b
      );

      return {
        date: day,
        mood: totalScore, // Now shows TOTAL emotion scores (not average)
        emotion: dominantEmotion,
      };
    });

    return result;
  };

  // Helper function to calculate weekly improvement percentage
  // Helper function to calculate weekly improvement percentage based on mood scores
  const getWeeklyImprovementPercentage = () => {
    const emotionToScore: { [key: string]: number } = {
      joy: 10,
      excitement: 9,
      love: 9,
      gratitude: 8,
      optimism: 7,
      amusement: 7,
      admiration: 7,
      pride: 7,
      relief: 5,
      caring: 6,
      neutral: 0,
      curiosity: 2,
      surprise: 1,
      confusion: -2,
      nervousness: -3,
      disappointment: -4,
      sadness: -6,
      fear: -7,
      anger: -8,
      grief: -9,
      disgust: -5,
    };

    const now = new Date();
    const currentDay = now.getDay();
    const currentWeekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - currentDay,
      0,
      0,
      0,
      0
    );

    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(currentWeekStart);

    // Calculate total mood score for current week
    let currentWeekScore = 0;
    let currentWeekCount = 0;

    journalEntries.forEach((entry: any) => {
      const entryDate = new Date(entry.createdAt);
      if (entryDate >= currentWeekStart) {
        const emotion = entry.mlAnalysis?.primary_emotion || "neutral";
        const score = emotionToScore[emotion] || 0;
        currentWeekScore += score;
        currentWeekCount += 1;
      }
    });

    // Calculate total mood score for last week
    let lastWeekScore = 0;
    let lastWeekCount = 0;

    journalEntries.forEach((entry: any) => {
      const entryDate = new Date(entry.createdAt);
      if (entryDate >= lastWeekStart && entryDate < lastWeekEnd) {
        const emotion = entry.mlAnalysis?.primary_emotion || "neutral";
        const score = emotionToScore[emotion] || 0;
        lastWeekScore += score;
        lastWeekCount += 1;
      }
    });

    // Calculate average mood scores
    const currentAvg =
      currentWeekCount > 0 ? currentWeekScore / currentWeekCount : 0;
    const lastAvg = lastWeekCount > 0 ? lastWeekScore / lastWeekCount : 0;

    // Handle edge cases
    if (lastWeekCount === 0 && currentWeekCount === 0) {
      return { percentage: 0, trend: "neutral" };
    }

    if (lastWeekCount === 0) {
      return { percentage: 100, trend: currentAvg > 0 ? "up" : "neutral" };
    }

    // Calculate percentage change in mood quality
    const percentageChange = Math.round(
      ((currentAvg - lastAvg) / Math.abs(lastAvg || 1)) * 100
    );

    return {
      percentage: Math.abs(percentageChange),
      trend:
        percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "neutral",
    };
  };

  // JSX for the graph component
  <Card className="p-6 shadow-lg border-0">
    <CardContent className="p-0 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-lg">This Week's Journey</h3>
        <TrendingUp className="text-[#667eea]" size={24} />
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={getMoodTrendData()}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke={colorContrast === "high" ? "#000" : "#888"}
            />
            <YAxis hide />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#667eea"
              strokeWidth={3}
              dot={{ fill: "#667eea", r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly improvement badge */}
      <div className="flex justify-center mt-4">
        {(() => {
          const improvement = getWeeklyImprovementPercentage();

          if (improvement.trend === "up") {
            return (
              <div className="px-4 py-1.5 rounded-full bg-green-400 text-white text-xs font-semibold">
                +{improvement.percentage}% improvement this week
              </div>
            );
          } else if (improvement.trend === "down") {
            return (
              <div className="px-4 py-1.5 rounded-full bg-red-400 text-white text-xs font-semibold">
                {improvement.percentage}% down from last week
              </div>
            );
          } else {
            return (
              <div className="px-4 py-1.5 rounded-full bg-blue-400 text-white text-xs font-semibold">
                Stable mood this week
              </div>
            );
          }
        })()}
      </div>
    </CardContent>
  </Card>;

  // Calculate positivity score based on recent emotions
  const getPositivityScore = () => {
    if (!journalEntries || journalEntries.length === 0) return 50;

    const positiveEmotions = [
      "joy",
      "excitement",
      "love",
      "gratitude",
      "optimism",
      "amusement",
      "admiration",
      "pride",
      "relief",
    ];
    const recentEntries = journalEntries.slice(0, 10); // Last 10 entries

    const positiveCount = recentEntries.filter((entry: any) =>
      positiveEmotions.includes(
        entry.mlAnalysis?.primary_emotion?.toLowerCase()
      )
    ).length;

    return Math.round((positiveCount / recentEntries.length) * 100);
  };

  // Get dominant emotion from recent entries
  const getDominantEmotion = () => {
    if (!journalEntries || journalEntries.length === 0) return null;

    const emotionCounts: { [key: string]: number } = {};
    const recentEntries = journalEntries.slice(0, 10);

    recentEntries.forEach((entry: any) => {
      if (entry.mlAnalysis?.primary_emotion) {
        const emotion = entry.mlAnalysis.primary_emotion;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    });

    const dominant = Object.entries(emotionCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];
    return dominant ? dominant[0] : null;
  };

  // Journal API Functions
  const fetchJournalEntries = async () => {
    try {
      setIsLoadingJournals(true);
      // Request all entries (set limit to a high number to get all entries)
      // Backend has pagination, so we need to pass limit parameter
      const response = await axios.get(
        `${API_BASE_URL}/journal?limit=1000&sortBy=createdAt&order=desc`,
        getAuthConfig()
      );
      if (response.data.success) {
        const entries = response.data.data;
        console.log(`📚 Fetched ${entries.length} journal entries (Total: ${response.data.total})`);
        
        // Debug: Check if mlAnalysis is present in entries
        if (entries.length > 0) {
          console.log('🔍 Sample entry structure:', {
            title: entries[0].title,
            mood: entries[0].mood,
            hasMlAnalysis: !!entries[0].mlAnalysis,
            mlAnalysis: entries[0].mlAnalysis
          });
        }
        
        setJournalEntries(entries);
        // Calculate streak immediately with the fetched entries
        calculateStreaksFromEntries(entries);
      }
    } catch (error: any) {
      console.error("Error fetching journal entries:", error);
      if (error.response?.status === 401) {
        handleSignOut();
      }
    } finally {
      setIsLoadingJournals(false);
    }
  };

  const createJournalEntry = async (entryData: any) => {
    try {
      setIsSavingJournal(true);
      
      // Use ML analysis directly - no mapping needed
      // ML model returns emotions like: joy, sadness, anger, fear, surprise, love, etc.
      let mlAnalysis = null;
      let detectedEmotion = entryData.mood || 'neutral'; // Fallback
      let mlTags: string[] = []; // Tags from ML
      
      // ⚠️ IMPORTANT: Replace this URL with your actual Hugging Face Space URL for journal ML
      const ML_JOURNAL_URL = import.meta.env.VITE_ML_JOURNAL_URL || 'https://namanj11-eunoia-ml-service.hf.space/analyze';
      
      try {
        console.log('🧠 Calling ML service for journal analysis...');
        console.log('📝 Entry data:', { 
          title: entryData.title, 
          contentLength: entryData.content?.length,
          mood: entryData.mood 
        });
        console.log('🌐 ML Service URL:', ML_JOURNAL_URL);
        
        const mlResponse = await axios.post(
          ML_JOURNAL_URL,
          {
            title: entryData.title,
            content: entryData.content
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds
          }
        );

        console.log('📥 ML Response received:', mlResponse.data);

        if (mlResponse.data.success && mlResponse.data.data) {
          mlAnalysis = mlResponse.data.data;
          
          // Use ML emotion directly - no mapping
          detectedEmotion = mlAnalysis.primary_emotion || entryData.mood || 'neutral';
          
          // Extract tags from ML analysis
          if (mlAnalysis.tags && Array.isArray(mlAnalysis.tags)) {
            mlTags = mlAnalysis.tags;
          }
          
          console.log('✅ ML Analysis completed successfully!');
          console.log('   Primary emotion:', detectedEmotion);
          console.log('   Confidence:', mlAnalysis.emotion_confidence);
          console.log('   Tags:', mlTags);
          console.log('   Summary:', mlAnalysis.emotional_state_summary);
        } else {
          console.warn('⚠️ ML response missing data, using fallback mood');
          console.log('   Response structure:', mlResponse.data);
          detectedEmotion = entryData.mood || 'neutral';
        }
      } catch (mlError: any) {
        console.error('❌ ML analysis failed:', {
          message: mlError.message,
          response: mlError.response?.data,
          status: mlError.response?.status,
          url: ML_JOURNAL_URL
        });
        console.warn('⚠️ Using fallback mood:', detectedEmotion);
        // Continue with journal creation even if ML fails
      }

      // Save journal entry to backend with ML analysis
      console.log('💾 Saving to backend:', {
        mood: detectedEmotion,
        tags: [...(entryData.tags || []), ...mlTags],
        hasMlAnalysis: !!mlAnalysis,
        mlAnalysisKeys: mlAnalysis ? Object.keys(mlAnalysis) : [],
        mlAnalysis: mlAnalysis
      });
      
      // Verify mlAnalysis is not null before saving
      if (!mlAnalysis) {
        console.warn('⚠️ WARNING: mlAnalysis is null! ML service may have failed.');
      }
      
      // Merge ML tags with user-selected tags (if any)
      const allTags = [...new Set([...(entryData.tags || []), ...mlTags])]; // Remove duplicates
      
      // Structure mlAnalysis explicitly to ensure it saves correctly
      const structuredMlAnalysis = mlAnalysis ? {
        primary_emotion: mlAnalysis.primary_emotion || null,
        emotion_confidence: mlAnalysis.emotion_confidence || 0,
        detected_emotions: mlAnalysis.detected_emotions || [],
        emotional_state_summary: mlAnalysis.emotional_state_summary || '',
        tags: mlAnalysis.tags || [],
        timestamp: mlAnalysis.timestamp || new Date().toISOString()
      } : null;
      
      const journalData = {
        ...entryData,
        mood: detectedEmotion, // Use ML-detected emotion directly
        tags: allTags, // Combine user tags and ML tags
        mlAnalysis: structuredMlAnalysis, // Send structured ML analysis
      };
      
      console.log('📤 Final payload being sent to backend:', journalData);
      console.log('📤 Structured mlAnalysis:', structuredMlAnalysis);
      
      const response = await axios.post(
        `${API_BASE_URL}/journal`,
        journalData,
        getAuthConfig()
      );
      
      console.log('📥 Backend response:', response.data);
      
      if (response.data.success) {
        console.log('✅ Journal entry saved successfully:', response.data.data);
        await fetchJournalEntries(); // Refresh list
        return response.data.data;
      }
    } catch (error: any) {
      console.error("Error creating journal entry:", error);
      alert("Failed to save journal entry. Please try again.");
      throw error;
    } finally {
      setIsSavingJournal(false);
    }
  };

  const deleteJournalEntry = async (entryId: string) => {
    if (isDeletingJournal) return false; // Prevent multiple clicks
    
    try {
      setIsDeletingJournal(true);
      const response = await axios.delete(
        `${API_BASE_URL}/journal/${entryId}`,
        getAuthConfig()
      );
      if (response.data.success) {
        // Remove from local state immediately
        const updatedEntries = journalEntries.filter(
          (entry) => entry._id !== entryId
        );
        setJournalEntries(updatedEntries);
        // Update streak count based on remaining entries
        calculateStreaksFromEntries(updatedEntries);
        return true;
      }
    } catch (error: any) {
      console.error("Error deleting journal entry:", error);
      alert("Failed to delete journal entry. Please try again.");
      return false;
    } finally {
      setIsDeletingJournal(false);
    }
  };

  // Calculate streak from journal entries (accepts entries parameter for immediate calculation)
  const calculateStreaksFromEntries = (entries: any[]) => {
    if (entries.length === 0) {
      setStreaks((prev) => ({
        ...prev,
        journal: 0,
        totalDays: 0,
        totalEntries: 0,
      }));
      return;
    }

    // Get unique days with entries (sorted) - use local date string to avoid timezone issues
    const uniqueDaysSet = new Set<string>();
    entries.forEach((entry) => {
      const date = new Date(entry.createdAt);
      // Get local date string in YYYY-MM-DD format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      uniqueDaysSet.add(dateStr);
    });

    // Convert to sorted array of Date objects (using local dates at noon to avoid DST issues)
    const uniqueDays = Array.from(uniqueDaysSet)
      .map((dateStr) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0, 0); // Use noon
        return date;
      })
      .sort((a, b) => b.getTime() - a.getTime()); // Most recent first

    // Calculate consecutive daily streak (for "Day X" counter at top)
    const today = new Date();
    const todayNoon = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0,
      0
    );

    let currentStreak = 0;
    let checkDate = new Date(todayNoon);

    // Check if there's an entry today or yesterday (streak is still active)
    const mostRecentEntry = uniqueDays[0];
    const daysSinceLastEntry = Math.round(
      (todayNoon.getTime() - mostRecentEntry.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If last entry is more than 1 day ago, streak is broken
    if (daysSinceLastEntry > 1) {
      setStreaks((prev) => ({
        ...prev,
        journal: 0,
        totalDays: uniqueDays.length,
        totalEntries: journalEntries.length,
      }));
      return;
    }

    // If last entry was yesterday, start checking from yesterday
    if (daysSinceLastEntry === 1) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days
    for (const entryDate of uniqueDays) {
      const daysApart = Math.round(
        (checkDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysApart === 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Gap in consecutive days - streak breaks
        break;
      }
    }

    setStreaks((prev) => ({
      ...prev,
      journal: currentStreak, // Consecutive days (for "Day X" at top)
      totalDays: uniqueDays.length, // Total unique days
      totalEntries: entries.length, // Total number of entries (for streak counters display)
    }));
  };

  // Load journal entries when user is authenticated - load immediately on mount
  useEffect(() => {
    console.log("Journal useEffect triggered", {
      currentUser: !!currentUser,
      journaling: preferences.journaling,
      hasLoaded: hasLoadedJournals.current,
    });
    if (currentUser && preferences.journaling && !hasLoadedJournals.current) {
      console.log("Fetching journal entries...");
      hasLoadedJournals.current = true;
      fetchJournalEntries();
    }
  }, [currentUser, preferences.journaling]);

  // Load wellness check, streaks, and chat sessions on mount
  // This must trigger EVERY time currentUser changes (including from null -> user on mount)
  // Spread out API calls slightly to avoid rate limiting
  useEffect(() => {
    console.log("Data fetch useEffect triggered", {
      currentUserId: currentUser?._id,
      timestamp: Date.now(),
      hasInitialized: hasInitializedData.current,
    });

    if (currentUser && !hasInitializedData.current) {
      console.log("Fetching all user data with staggered timing...");
      hasInitializedData.current = true; // Mark as initialized before fetching

      // Wrap all fetches in try-catch to prevent blank screen on error
      const fetchData = async () => {
        try {
          // Fetch immediately
          await fetchTodayWellnessCheck();

          // Stagger remaining calls to avoid rate limit
          setTimeout(async () => {
            try {
              await fetchMoodStreak();
            } catch (err) {
              console.error("Error in fetchMoodStreak:", err);
            }
          }, 100);

          setTimeout(async () => {
            try {
              await fetchMindfulnessStreak();
            } catch (err) {
              console.error("Error in fetchMindfulnessStreak:", err);
            }
          }, 200);

          setTimeout(async () => {
            try {
              await fetchChatSessions();
            } catch (err) {
              console.error("Error in fetchChatSessions:", err);
            }
          }, 300);
        } catch (err) {
          console.error("Error in initial data fetch:", err);
        }
      };

      fetchData();
    }
  }, [currentUser]);

  // Update streaks whenever journal entries change
  useEffect(() => {
    if (journalEntries.length > 0) {
      calculateStreaksFromEntries(journalEntries);
    }
  }, [journalEntries]);

  // Auto-close achievements when switching screens
  useEffect(() => {
    setShowAllAchievements(false);
  }, [currentScreen]);

  // Chat API Functions
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null); // Ref for synchronous access
  const hasInitializedData = useRef(false); // Track if we've loaded data on mount
  const hasLoadedJournals = useRef(false); // Track if we've loaded journals for current user
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  const fetchChatSessions = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/sessions`,
        getAuthConfig()
      );
      if (response.data.success) {
        setChatSessions(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching chat sessions:", error);
    }
  };

  const createChatSession = async (firstMessage?: string) => {
    try {
      // Generate a smart title from the first message (max 40 chars)
      let title = "New Chat";
      if (firstMessage) {
        title =
          firstMessage.length > 40
            ? firstMessage.substring(0, 40) + "..."
            : firstMessage;
      }

      console.log("🆕 Creating new chat session with title:", title);
      const response = await axios.post(
        `${API_BASE_URL}/chat/sessions`,
        { title },
        getAuthConfig()
      );
      console.log("✅ Session creation response:", response.data);

      if (response.data.success) {
        const newSessionId = response.data.data.sessionId;
        setCurrentSessionId(newSessionId);
        currentSessionIdRef.current = newSessionId; // Update ref synchronously
        console.log("✅ Session ID set:", newSessionId);
        return newSessionId;
      }
    } catch (error: any) {
      console.error(
        "❌ Error creating chat session:",
        error.response?.data || error.message
      );
      return null;
    }
  };

  const sendChatMessage = async (
    content: string,
    role: "user" | "assistant",
    isFirstMessage: boolean = false
  ) => {
    console.log("💾 sendChatMessage called:", {
      role,
      contentLength: content.length,
      currentSessionId,
      refSessionId: currentSessionIdRef.current,
    });

    // Use ref for synchronous access to session ID (state updates are async)
    let sessionId = currentSessionIdRef.current || currentSessionId;

    if (!sessionId) {
      // Only create session when user sends first message
      if (role === "user") {
        console.log("🆕 No session exists, creating new session...");
        const newSessionId = await createChatSession(content);
        if (!newSessionId) {
          console.error("❌ Failed to create session");
          return false;
        }
        sessionId = newSessionId; // Use the newly created session ID
        console.log("✅ Session created:", sessionId);
      } else {
        // Don't save AI messages if no session exists yet
        console.error("❌ Cannot save AI message: No active session");
        return false;
      }
    }

    try {
      console.log("📤 Sending message to backend:", { sessionId, role });
      const response = await axios.post(
        `${API_BASE_URL}/chat/sessions/${sessionId}/messages`,
        { role, content },
        getAuthConfig()
      );
      console.log("✅ Message saved successfully:", response.data);
      return response.data.success;
    } catch (error: any) {
      console.error(
        "❌ Error sending chat message:",
        error.response?.data || error.message
      );
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
          role: msg.role === "assistant" ? "ai" : msg.role,
          content: msg.content,
        }));
        setChatMessages(messages);
      }
    } catch (error: any) {
      console.error("Error loading chat session:", error);
    }
  };

  const deleteChatSession = (sessionId: string) => {
    if (isDeletingChat) return; // Prevent multiple clicks
    
    setDeleteDialog({
      isOpen: true,
      title: "Delete Chat",
      message:
        "Are you sure you want to delete this chat? This action cannot be undone.",
      onConfirm: async () => {
        try {
          setIsDeletingChat(true);
          const response = await axios.delete(
            `${API_BASE_URL}/chat/sessions/${sessionId}`,
            getAuthConfig()
          );

          if (response.data.success) {
            // Remove from local state
            setChatSessions((prev) =>
              prev.filter((s) => s.sessionId !== sessionId)
            );

            // If this was the current session, clear it and start fresh (no empty session)
            if (currentSessionId === sessionId) {
              setCurrentSessionId(null);
              currentSessionIdRef.current = null; // Clear ref
              setChatMessages([
                {
                  role: "ai",
                  content:
                    "Hello! I'm your wellness companion. How are you feeling today?",
                },
              ]);
              // Don't create empty session - will be created when user sends first message
            }

            console.log("Chat deleted successfully");
          }
        } catch (error: any) {
          console.error("Error deleting chat session:", error);
          alert("Failed to delete chat. Please try again.");
        } finally {
          setIsDeletingChat(false);
          setDeleteDialog({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          });
        }
      },
    });
  };

  // Wellness Check Functions
  const saveWellnessCheck = async (
    mood: number,
    analysis: string,
    answers: { [key: string]: string }
  ) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/wellness`,
        { mood, analysis, answers },
        getAuthConfig()
      );
      if (response.data.success) {
        console.log("Wellness check saved successfully");
        // Fetch updated mood streak
        fetchMoodStreak();
      }
    } catch (error: any) {
      console.error("Error saving wellness check:", error);
      // Don't show error to user - silent fail
    }
  };

  const fetchTodayWellnessCheck = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/wellness/today`,
        getAuthConfig()
      );
      if (response.data.success && response.data.data) {
        const wellnessData = response.data.data;
        setDailyWellnessCompleted(true);
        setAnalyzedMood({
          mood: wellnessData.mood,
          analysis: wellnessData.analysis,
        });
      }
    } catch (error: any) {
      console.error("Error fetching wellness check:", error);
    }
  };

  const fetchMoodStreak = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/wellness/streak`,
        getAuthConfig()
      );
      if (response.data.success) {
        setStreaks((prev) => ({ ...prev, mood: response.data.data.streak }));
      }
    } catch (error: any) {
      console.error("Error fetching mood streak:", error);
    }
  };

  const fetchMindfulnessStreak = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/mindfulness-streak`,
        getAuthConfig()
      );
      if (response.data.success) {
        setStreaks((prev) => ({
          ...prev,
          meditation: response.data.data.streak,
        }));
      }
    } catch (error: any) {
      console.error("Error fetching mindfulness streak:", error);
    }
  };

  // Don't create empty sessions - session will be created when user sends first message
  // This prevents blank chats from being saved to history
  useEffect(() => {
    if (
      currentUser &&
      preferences.aiChat &&
      currentScreen === "ai-chat" &&
      !currentSessionId
    ) {
      // Just ensure we have the greeting message, session created on first user message
    }
  }, [currentUser, preferences.aiChat, currentScreen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Close chat history when user switches tabs
  useEffect(() => {
    setShowChatHistory(false);
  }, [currentScreen]);

  // Mock data
  // Get real data from journal entries with ML analysis
  const moodData: MoodEntry[] = getMoodTrendData();
  const moodDataWithValues = moodData.filter(
    (entry) => entry.mood !== null
  ) as { date: string; mood: number; emotion: string }[];
  const emotionData: EmotionData[] = getEmotionBreakdown();
  const positivityScore = getPositivityScore();
  const dominantEmotion = getDominantEmotion();

  const moodEmojis = [
    "😔",
    "😕",
    "😐",
    "🙂",
    "😊",
    "😄",
    "😁",
    "🤩",
    "🥰",
    "🌟",
  ];

  const dailyPrompts = [
    "What made you smile today?",
    "What are you grateful for right now?",
    "How did you take care of yourself today?",
    "What's one positive thing that happened?",
    "What emotion are you experiencing most?",
  ];

  const streakMilestones = [
    { days: 7, title: "Week Warrior", icon: "🌟", color: "#68d391" },
    { days: 14, title: "Mindful Master", icon: "🧘", color: "#667eea" },
    { days: 30, title: "Wellness Champion", icon: "🏆", color: "#f093fb" },
    { days: 60, title: "Peace Pioneer", icon: "🕊️", color: "#764ba2" },
    { days: 100, title: "Zen Legend", icon: "🦋", color: "#ffecd2" },
  ];

  const getCurrentMilestone = (streak: number) => {
    return streakMilestones
      .filter((milestone) => streak >= milestone.days)
      .sort((a, b) => b.days - a.days)[0];
  };

  const getNextMilestone = (streak: number) => {
    return streakMilestones.find((milestone) => streak < milestone.days);
  };

  // Contrast helper functions
  const getContrastClass = (
    standardClass: string,
    highClass: string,
    lowClass: string
  ) => {
    if (colorContrast === "high") return highClass;
    if (colorContrast === "low") return lowClass;
    return standardClass;
  };

  const getContrastTextClass = (
    type: "primary" | "secondary" | "heading" | "muted"
  ) => {
    if (colorContrast === "high") {
      switch (type) {
        case "primary":
          return "text-gray-900 font-semibold";
        case "secondary":
          return "text-gray-800";
        case "heading":
          return "text-gray-900 font-bold";
        case "muted":
          return "text-gray-700";
      }
    }
    if (colorContrast === "low") {
      switch (type) {
        case "primary":
          return "text-gray-600";
        case "secondary":
          return "text-gray-500";
        case "heading":
          return "text-gray-700";
        case "muted":
          return "text-gray-400";
      }
    }
    // Standard
    switch (type) {
      case "primary":
        return "text-gray-800";
      case "secondary":
        return "text-gray-600";
      case "heading":
        return "text-gray-800 font-bold";
      case "muted":
        return "text-gray-500";
    }
  };

  const getContrastBorderClass = () => {
    if (colorContrast === "high") return "border-2 border-gray-300";
    if (colorContrast === "low") return "border border-gray-100";
    return "border border-gray-200";
  };

  const getContrastBgClass = (variant: "card" | "hover" | "active") => {
    if (colorContrast === "high") {
      switch (variant) {
        case "card":
          return "bg-white shadow-lg";
        case "hover":
          return "hover:bg-gray-100";
        case "active":
          return "bg-blue-50";
      }
    }
    if (colorContrast === "low") {
      switch (variant) {
        case "card":
          return "bg-gray-50";
        case "hover":
          return "hover:bg-gray-100";
        case "active":
          return "bg-blue-50";
      }
    }
    // Standard
    switch (variant) {
      case "card":
        return "bg-white";
      case "hover":
        return "hover:bg-gray-50";
      case "active":
        return "bg-blue-50";
    }
  };

  // Goal-based achievements
  const goalAchievements = [
    {
      id: "first_entry",
      title: "Journal Starter",
      description: "Created your first journal entry",
      icon: "✨",
      goal: 1,
      type: "entries",
      achieved: (journalEntries?.length ?? 0) >= 1,
    },
    {
      id: "ten_entries",
      title: "Daily Writer",
      description: "Written 10 journal entries",
      icon: "📝",
      goal: 10,
      type: "entries",
      achieved: (journalEntries?.length ?? 0) >= 10,
    },
    {
      id: "fifty_entries",
      title: "Deep Thinker",
      description: "Written 50 journal entries",
      icon: "🧠",
      goal: 50,
      type: "entries",
      achieved: (journalEntries?.length ?? 0) >= 50,
    },
    {
      id: "hundred_entries",
      title: "Wisdom Keeper",
      description: "Written 100 journal entries",
      icon: "📖",
      goal: 100,
      type: "entries",
      achieved: (journalEntries?.length ?? 0) >= 100,
    },
    {
      id: "ten_chats",
      title: "Chat Explorer",
      description: "Completed 10 AI chat sessions",
      icon: "💬",
      goal: 10,
      type: "chats",
      achieved: (chatSessions?.length ?? 0) >= 10,
    },
    {
      id: "fifty_chats",
      title: "Conversation Pro",
      description: "Completed 50 AI chat sessions",
      icon: "🗨️",
      goal: 50,
      type: "chats",
      achieved: (chatSessions?.length ?? 0) >= 50,
    },
    {
      id: "hundred_chats",
      title: "Chat Champion",
      description: "Completed 100 AI chat sessions",
      icon: "🏆",
      goal: 100,
      type: "chats",
      achieved: (chatSessions?.length ?? 0) >= 100,
    },
    {
      id: "high_positivity",
      title: "Optimist",
      description: "Maintained 70%+ positivity score",
      icon: "😊",
      goal: 70,
      type: "positivity",
      achieved: positivityScore >= 70,
    },
    {
      id: "consistent_week",
      title: "Streak Master",
      description: "Journaled every day this week",
      icon: "🔥",
      goal: 7,
      type: "weekly",
      achieved: streaks.journal >= 7,
    },
  ];

  const getUnlockedAchievements = () => {
    return goalAchievements.filter((achievement) => achievement.achieved);
  };

  const getNextGoalAchievement = () => {
    return goalAchievements.find((achievement) => !achievement.achieved);
  };

  // Mood questionnaire
  const moodQuestions = [
    {
      question: "How would you describe your energy level today?",
      options: [
        { text: "Very low, feeling drained", value: "low", mood: 3 },
        {
          text: "Somewhat tired but manageable",
          value: "moderate-low",
          mood: 5,
        },
        { text: "Balanced and steady", value: "balanced", mood: 7 },
        { text: "Energetic and motivated", value: "high", mood: 9 },
      ],
    },
    {
      question: "What's your main emotional state right now?",
      options: [
        { text: "Anxious or worried", value: "anxious", mood: 4 },
        { text: "Sad or down", value: "sad", mood: 3 },
        { text: "Content and peaceful", value: "content", mood: 7 },
        { text: "Happy and optimistic", value: "happy", mood: 8 },
      ],
    },
    {
      question: "How connected do you feel to others today?",
      options: [
        { text: "Very isolated and alone", value: "isolated", mood: 2 },
        { text: "Somewhat disconnected", value: "disconnected", mood: 4 },
        { text: "Reasonably connected", value: "connected", mood: 7 },
        { text: "Very supported and loved", value: "supported", mood: 9 },
      ],
    },
  ];

  const suggestedPrompts = [
    "I'm feeling overwhelmed with work lately",
    "I want to build better habits",
    "Help me with anxiety management",
    "I'm struggling with sleep",
    "I need motivation today",
    "How can I practice self-care?",
  ];

  const sendMessage = useCallback(
    async (message?: string) => {
      const messageToSend = message || newMessage;
      if (!messageToSend.trim()) return;

      // Add user message to UI immediately
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: messageToSend },
      ]);
      setNewMessage("");

      // Save user message to database - MUST AWAIT to ensure session is created first!
      try {
        await sendChatMessage(messageToSend, "user");
        console.log("✅ User message saved, session ready");
      } catch (err) {
        console.error("❌ Failed to save user message:", err);
      }

      // Show typing indicator
      const typingMessage = { role: "ai", content: "..." };
      setChatMessages((prev) => [...prev, typingMessage]);

      try {
        // Get conversation history for context (last 8 messages for token efficiency)
        const conversationHistory = chatMessages.slice(-8).map((msg) => ({
          role: msg.role === "ai" ? "assistant" : msg.role,
          content: msg.content,
        }));

        let aiMessage = "";

        // Call HF Space directly (no backend fallback)
        try {
          const response = await axios.post(
            "https://eunoia-chatbot-dtduhpgtbybgguh9.centralindia-01.azurewebsites.net/chat",
            {
              message: messageToSend,
              conversation_history: conversationHistory,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 30000, // 30 seconds
            }
          );

          if (response.data.success) {
            aiMessage = response.data.response;
          } else {
            throw new Error("AI service returned unsuccessful response");
          }
        } catch (hfError: any) {
          console.error("AI Chat service unavailable:", hfError.message);

          // Show user-friendly error message
          setChatMessages((prev) => {
            const filtered = prev.filter((msg) => msg.content !== "...");
            return [
              ...filtered,
              {
                role: "ai",
                content:
                  "I'm sorry, but I'm currently unavailable. The AI chat service seems to be down. Please try again in a few minutes. 🙏",
              },
            ];
          });
          return; // Exit early
        }

        if (aiMessage) {
          // Remove typing indicator and add AI response
          setChatMessages((prev) => {
            const filtered = prev.filter((msg) => msg.content !== "...");
            return [...filtered, { role: "ai", content: aiMessage }];
          });

          // Save AI response to database and update streaks & sessions
          try {
            await sendChatMessage(aiMessage, "assistant");
            // Update mindfulness streak and chat sessions count after successful chat
            fetchMindfulnessStreak();
            fetchChatSessions(); // Update chat sessions for achievements
          } catch (err) {
            console.error("Failed to save AI message:", err);
          }
        }
      } catch (error: any) {
        console.error("Unexpected error in AI chat:", error);

        // Remove typing indicator and show generic error
        setChatMessages((prev) => {
          const filtered = prev.filter((msg) => msg.content !== "...");
          return [
            ...filtered,
            {
              role: "ai",
              content:
                "An unexpected error occurred. Please try refreshing the page. 😔",
            },
          ];
        });
      }
    },
    [newMessage, currentSessionId, chatMessages]
  );

  const getMoodEmoji = (mood: number) => {
    if (mood >= 9) return "🌟";
    if (mood >= 8) return "😊";
    if (mood >= 7) return "🙂";
    if (mood >= 6) return "😌";
    if (mood >= 5) return "😐";
    if (mood >= 4) return "😕";
    if (mood >= 3) return "😔";
    return "💙";
  };

  const getMoodLabel = (mood: number) => {
    if (mood >= 8) return "Excellent";
    if (mood >= 7) return "Good";
    if (mood >= 6) return "Balanced";
    if (mood >= 5) return "Neutral";
    if (mood >= 4) return "Low";
    return "Struggling";
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
    if (colorContrast === "high") {
      return {
        primary: "#5b21b6", // Bright vibrant purple
        secondary: "#ec4899", // Bright vibrant pink
        accent: "#6366f1", // Bright vibrant indigo
        bgGradientFrom: "#f0f9ff",
        bgGradientTo: "#dbeafe",
        cardBg: "#ffffff",
        textPrimary: "#1e293b",
        textSecondary: "#334155",
        gradient: "from-[#5b21b6] to-[#ec4899]",
        bgGradient: "from-[#f0f9ff] to-[#dbeafe]",
      };
    } else if (colorContrast === "low") {
      return {
        primary: "#a8b3d1", // Soft powder blue
        secondary: "#e8b4d6", // Soft rose pink
        accent: "#b8a8d8", // Soft lilac
        bgGradientFrom: "#fdfcfd",
        bgGradientTo: "#f8f6f9",
        cardBg: "#fefefd",
        textPrimary: "#4a4d5a",
        textSecondary: "#6b6e7b",
        gradient: "from-[#a8b3d1] to-[#e8b4d6]",
        bgGradient: "from-[#fdfcfd] to-[#f8f6f9]",
      };
    }
    // Standard contrast (default) - vibrant but balanced (ORIGINAL)
    return {
      primary: "#667eea",
      secondary: "#f093fb",
      accent: "#764ba2",
      bgGradientFrom: "#fafbff",
      bgGradientTo: "#e6f3ff",
      cardBg: "#f7fafc",
      textPrimary: "#2d3748",
      textSecondary: "#4a5568",
      gradient: "from-[#667eea] to-[#f093fb]",
      bgGradient: "from-[#fafbff] to-[#e6f3ff]",
    };
  })();

  // Apply contrast styling with dynamic color values
  const getContrastStyles = (): React.CSSProperties => {
    if (colorContrast === "high") {
      return {
        "--color-primary": "#5b21b6", // Bright vibrant purple
        "--color-secondary": "#ec4899", // Bright vibrant pink
        "--color-accent": "#6366f1", // Bright vibrant indigo
        "--color-bg-from": "#f0f9ff", // Lighter background
        "--color-bg-to": "#dbeafe", // Lighter background
        "--color-card-bg": "#ffffff", // Pure white cards
        "--color-text-primary": "#1e293b", // Darker text for contrast
        "--color-text-secondary": "#334155", // Darker secondary text
      } as React.CSSProperties;
    } else if (colorContrast === "low") {
      return {
        "--color-primary": "#a8b3d1", // Soft powder blue
        "--color-secondary": "#e8b4d6", // Soft rose pink
        "--color-accent": "#b8a8d8", // Soft lilac
        "--color-bg-from": "#fdfcfd", // Very light with warmth
        "--color-bg-to": "#f8f6f9", // Light with gentle tint
        "--color-card-bg": "#fefefd", // Warm off-white
        "--color-text-primary": "#4a4d5a", // Readable soft text
        "--color-text-secondary": "#6b6e7b", // Medium soft text
      } as React.CSSProperties;
    }
    // Standard contrast - vibrant but balanced (ORIGINAL)
    return {
      "--color-primary": "#667eea", // Standard vibrant blue
      "--color-secondary": "#f093fb", // Standard vibrant pink
      "--color-accent": "#764ba2", // Standard purple
      "--color-bg-from": "#fafbff", // Soft white-blue
      "--color-bg-to": "#e6f3ff", // Soft blue
      "--color-card-bg": "#f7fafc", // Soft white
      "--color-text-primary": "#2d3748", // Standard dark text
      "--color-text-secondary": "#4a5568", // Standard gray text
    } as React.CSSProperties;
  };

  const analyzeMoodFromQuestionnaire = () => {
    const answers = Object.values(moodAnswers);
    const moodScores = answers.map((answer) => {
      const question = moodQuestions.find((q) =>
        q.options.some((opt) => opt.value === answer)
      );
      return question?.options.find((opt) => opt.value === answer)?.mood || 5;
    });

    const averageMood =
      moodScores.reduce((a, b) => a + b, 0) / moodScores.length;

    let analysis = "";
    if (averageMood >= 8) {
      analysis =
        "You're in a wonderful headspace today! Your responses show high energy, positive emotions, and strong social connections. This is a great time to celebrate your wellbeing and perhaps set intentions for maintaining this positive momentum.";
    } else if (averageMood >= 6) {
      analysis =
        "You're doing reasonably well today. While there might be some areas of challenge, you're maintaining a balanced perspective. Consider what small actions might help you feel even more supported and energized.";
    } else if (averageMood >= 4) {
      analysis =
        "I notice you're experiencing some difficulties today. It's completely okay to have challenging days - they're part of the human experience. Consider reaching out for support and practicing extra self-compassion today.";
    } else {
      analysis =
        "It sounds like today has been particularly tough for you. Please know that these feelings are temporary, even when they feel overwhelming. You deserve support and care. Consider connecting with someone you trust or engaging in gentle self-care practices.";
    }

    return { mood: Math.round(averageMood), analysis };
  };

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <div className="h-screen max-w-md mx-auto flex items-center justify-center bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <Brain className="text-white" size={32} />
          </div>
          <p className="text-white text-lg font-semibold">Loading Eunoia...</p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (currentScreen === "login") {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          // Clear all previous user data first
          setJournalEntries([]);
          setChatMessages([
            {
              role: "ai",
              content:
                "Hello! I'm your wellness companion. How are you feeling today?",
            },
          ]);
          setCurrentSessionId(null);
          currentSessionIdRef.current = null; // Clear ref
          hasInitializedData.current = false; // Reset initialization flag to allow data fetch
          hasLoadedJournals.current = false; // Reset journal load flag
          setChatSessions([]);
          setShowChatHistory(false);
          setStreaks({
            journal: 0,
            mood: 0,
            meditation: 0,
            totalDays: 0,
            totalEntries: 0,
          });
          setJournalText("");
          setJournalTitle("");
          resetKeystrokes();

          // Get user data from localStorage and set it
          const user = localStorage.getItem("user");
          if (user) {
            try {
              const userData = JSON.parse(user);
              console.log("Setting currentUser after login:", userData);
              setCurrentUser(userData);
            } catch (error) {
              console.error("Error parsing user data:", error);
            }
          }
          setCurrentScreen("onboarding");
        }}
      />
    );
  }

  if (currentScreen === "onboarding") {
    // Touch handling for swipe gestures
    const handleTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null); // Reset touchEnd on new touch
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      // If touchStart or touchEnd is null, or they're the same (tap), do nothing
      if (!touchStart || !touchEnd) return;

      const swipeDistance = touchStart - touchEnd;
      const minSwipeDistance = 150; // Minimum distance for a swipe

      // Only trigger if the swipe distance is significant
      if (Math.abs(swipeDistance) < minSwipeDistance) {
        return; // Not a swipe, just a tap or small movement
      }

      // Swipe left - next screen
      if (swipeDistance > minSwipeDistance && onboardingStep < 2) {
        setOnboardingStep(onboardingStep + 1);
      }

      // Swipe right - previous screen
      if (swipeDistance < -minSwipeDistance && onboardingStep > 0) {
        setOnboardingStep(onboardingStep - 1);
      }

      // Reset touch state
      setTouchStart(null);
      setTouchEnd(null);
    };

    const onboardingScreens = [
      {
        title: "Welcome to Eunoia",
        subtitle:
          "Your AI-powered companion for mental wellness and beautiful thinking",
        content: (
          <div className="text-center space-y-4">
            {/* Eunoia Logo */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-full flex items-center justify-center shadow-2xl">
                <div className="font-bold text-white flex items-center">
                  <Brain className="mr-1" size={33} />
                  <span style={{ fontSize: "2.75rem", lineHeight: 1 }}>ε</span>
                </div>
              </div>

              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="text-yellow-600" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold bg-gradient-to-r from-[#667eea] to-[#f093fb] bg-clip-text text-transparent">
                εὔνοια (Eunoia)
              </h2>
              <p className="text-gray-600 text-xs italic">
                "Beautiful thinking" - the goodwill between mind and heart
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-3xl">
                <div className="w-10 h-10 bg-white/70 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Heart className="text-[#667eea]" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">
                    Mindful Mood Tracking
                  </p>
                  <p className="text-xs text-gray-600">
                    AI-powered emotional insights
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#fed7e2] to-[#ffecd2] rounded-3xl">
                <div className="w-10 h-10 bg-white/70 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="text-[#f093fb]" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">
                    Sacred Journaling
                  </p>
                  <p className="text-xs text-gray-600">
                    Your private sanctuary for thoughts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#ffecd2] to-[#e6f3ff] rounded-3xl">
                <div className="w-10 h-10 bg-white/70 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Brain className="text-[#764ba2]" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">
                    Compassionate AI
                  </p>
                  <p className="text-xs text-gray-600">
                    Empathetic support when you need it
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-3xl">
                <div className="w-10 h-10 bg-white/70 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="text-[#667eea]" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">
                    Growth Insights
                  </p>
                  <p className="text-xs text-gray-600">
                    Patterns that illuminate your journey
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "How would you like to express yourself?",
        subtitle: "Choose your preferred methods of self-reflection",
        content: (
          <div className="space-y-4">
            {/* Visual representation */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-3xl flex items-center justify-center shadow-xl">
                <Sparkles className="text-white" size={28} />
              </div>
            </div>

            <div className="space-y-3">
              {/* Journaling Card - REMOVED onClick */}
              <Card
                className={`p-4 transition-all duration-300 ${
                  preferences.journaling
                    ? "border-[#667eea] bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] shadow-lg"
                    : "border-gray-200 hover:border-[#667eea]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#667eea] rounded-2xl flex items-center justify-center flex-shrink-0">
                      <FileText className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        Written Reflection
                      </p>
                      <p className="text-xs text-gray-600">
                        Express your thoughts through words
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.journaling}
                    onCheckedChange={(checked: boolean) =>
                      setPreferences((prev) => ({
                        ...prev,
                        journaling: checked,
                      }))
                    }
                  />
                </div>
              </Card>

              {/* AI Chat Card - REMOVED onClick */}
              <Card
                className={`p-4 transition-all duration-300 ${
                  preferences.aiChat
                    ? "border-[#f093fb] bg-gradient-to-r from-[#fed7e2] to-[#e6f3ff] shadow-lg"
                    : "border-gray-200 hover:border-[#f093fb]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f093fb] rounded-2xl flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        AI Chat Support
                      </p>
                      <p className="text-xs text-gray-600">
                        Chat with your wellness companion
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.aiChat}
                    onCheckedChange={(checked: boolean) =>
                      setPreferences((prev) => ({ ...prev, aiChat: checked }))
                    }
                  />
                </div>
              </Card>
            </div>
          </div>
        ),
      },
      {
        title: "Choose Your Color Comfort",
        subtitle: "Select the color contrast that feels right for you",
        content: (
          <div className="space-y-4">
            {/* Visual representation */}
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-3xl flex items-center justify-center shadow-xl">
                <Sparkles className="text-white" size={28} />
              </div>
              <p className="text-xs text-gray-600">
                Colors affect our mood and wellbeing. Choose what feels most
                comfortable for you today.
              </p>
            </div>

            <div className="space-y-2">
              <Card
                className={`p-4 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  colorContrast === "high"
                    ? "border-[#5b21b6] shadow-lg"
                    : "border-gray-200 hover:border-[#5b21b6]/50"
                }`}
                style={
                  colorContrast === "high"
                    ? {
                        background:
                          "linear-gradient(135deg, #5b21b6 0%, #ec4899 100%)",
                      }
                    : {}
                }
                onClick={() => setColorContrast("high")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #5b21b6 0%, #ec4899 100%)",
                      }}
                    >
                      <Sparkles className="text-white" size={18} />
                    </div>
                    <div>
                      <p
                        className={`font-semibold text-sm ${
                          colorContrast === "high"
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        High Contrast
                      </p>
                      <p
                        className={`text-xs ${
                          colorContrast === "high"
                            ? "text-white/90"
                            : "text-gray-700"
                        }`}
                      >
                        Bold, vibrant colors for clarity
                      </p>
                    </div>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={
                      colorContrast === "high"
                        ? { borderColor: "#667eea", backgroundColor: "#667eea" }
                        : { borderColor: "#d1d5db" }
                    }
                  >
                    {colorContrast === "high" && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  colorContrast === "standard"
                    ? "border-[#667eea] shadow-lg"
                    : "border-gray-200 hover:border-[#667eea]/50"
                }`}
                style={
                  colorContrast === "standard"
                    ? {
                        background:
                          "linear-gradient(135deg, #667eea 0%, #f093fb 100%)",
                      }
                    : {}
                }
                onClick={() => setColorContrast("standard")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #667eea 0%, #f093fb 100%)",
                      }}
                    >
                      <Sparkles className="text-white" size={18} />
                    </div>
                    <div>
                      <p
                        className={`font-semibold text-sm ${
                          colorContrast === "standard"
                            ? "text-white"
                            : "text-gray-800"
                        }`}
                      >
                        Standard Contrast
                      </p>
                      <p
                        className={`text-xs ${
                          colorContrast === "standard"
                            ? "text-white/90"
                            : "text-gray-600"
                        }`}
                      >
                        Balanced, comfortable colors
                      </p>
                    </div>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={
                      colorContrast === "standard"
                        ? { borderColor: "#667eea", backgroundColor: "#667eea" }
                        : { borderColor: "#d1d5db" }
                    }
                  >
                    {colorContrast === "standard" && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  colorContrast === "low"
                    ? "border-[#a8b3d1] shadow-lg"
                    : "border-gray-200 hover:border-[#a8b3d1]/50"
                }`}
                style={
                  colorContrast === "low"
                    ? {
                        background:
                          "linear-gradient(135deg, #a8b3d1 0%, #e8b4d6 100%)",
                      }
                    : {}
                }
                onClick={() => setColorContrast("low")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #a8b3d1 0%, #e8b4d6 100%)",
                      }}
                    >
                      <Sparkles className="text-white" size={18} />
                    </div>
                    <div>
                      <p
                        className={`font-semibold text-sm ${
                          colorContrast === "low"
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        Low Contrast
                      </p>
                      <p
                        className={`text-xs ${
                          colorContrast === "low"
                            ? "text-white/90"
                            : "text-gray-600"
                        }`}
                      >
                        Soft, soothing colors for calm
                      </p>
                    </div>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={
                      colorContrast === "low"
                        ? { borderColor: "#667eea", backgroundColor: "#667eea" }
                        : { borderColor: "#d1d5db" }
                    }
                  >
                    {colorContrast === "low" && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
              <p className="text-xs text-blue-800 text-center">
                💡 You can change this anytime from your profile settings
              </p>
            </div>
          </div>
        ),
      },
    ];

    return (
      <div
        className="h-screen flex flex-col p-4 max-w-md mx-auto overflow-hidden"
        style={{
          background: `linear-gradient(to bottom right, ${colors.bgGradientFrom}, ${colors.bgGradientTo})`,
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto space-y-3">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-gray-800">
                {onboardingScreens[onboardingStep].title}
              </h1>
              <p className="text-xs text-gray-600">
                {onboardingScreens[onboardingStep].subtitle}
              </p>
            </div>

            {onboardingScreens[onboardingStep].content}
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto pt-4 flex items-center justify-between">
          <div className="flex gap-2">
            {onboardingScreens.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === onboardingStep ? "bg-[#667eea] w-6" : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={() => {
              if (onboardingStep < onboardingScreens.length - 1) {
                setOnboardingStep(onboardingStep + 1);
              } else {
                // Mark onboarding as completed
                localStorage.setItem("hasCompletedOnboarding", "true");
                setCurrentScreen("home");
              }
            }}
            className="bg-[#667eea] hover:bg-[#5a67d8] text-white rounded-full px-6 h-10"
          >
            {onboardingStep === onboardingScreens.length - 1
              ? "Get Started"
              : "Next"}
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen max-w-md mx-auto relative overflow-hidden flex flex-col"
      style={{
        backgroundColor: colors.bgGradientFrom,
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Mood Questionnaire */}
      {currentScreen === "mood-questionnaire" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 content-with-bottom-nav">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setCurrentScreen("home")}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowRight className="rotate-180" size={20} />
            </Button>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {currentQuestion + 1} of {moodQuestions.length}
              </p>
              <Progress
                value={((currentQuestion + 1) / moodQuestions.length) * 100}
                className="w-24 h-2 mx-auto mt-1"
              />
            </div>
            <div className="w-10"></div>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-3xl flex items-center justify-center mx-auto">
              <Heart className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Wellness Check-in
              </h1>
              <p className="text-gray-600">
                Take a moment to reflect on how you're feeling
              </p>
            </div>
          </div>

          <Card className="p-6 bg-gradient-to-br from-[#f7fafc] to-[#e6f3ff] border-0 shadow-lg">
            <CardContent className="p-0 space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 text-center leading-relaxed">
                {moodQuestions[currentQuestion]?.question}
              </h3>

              <div className="space-y-3">
                {moodQuestions[currentQuestion]?.options.map(
                  (option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => {
                        setMoodAnswers((prev) => ({
                          ...prev,
                          [currentQuestion]: option.value,
                        }));

                        if (currentQuestion < moodQuestions.length - 1) {
                          setCurrentQuestion(currentQuestion + 1);
                        } else {
                          // Analyze mood and show results
                          const result = analyzeMoodFromQuestionnaire();
                          setCurrentMood([result.mood]);
                          setAnalyzedMood(result);
                          setDailyWellnessCompleted(true);
                          // Save to backend
                          saveWellnessCheck(
                            result.mood,
                            result.analysis,
                            moodAnswers
                          );
                          setCurrentScreen("home");
                          setCurrentQuestion(0);
                          setMoodAnswers({});
                        }
                      }}
                      className={`w-full p-4 text-left rounded-2xl border-2 transition-all duration-200 hover:scale-105 ${
                        moodAnswers[currentQuestion] === option.value
                          ? "border-[#667eea] bg-[#e6f3ff] text-[#667eea]"
                          : "border-gray-200 hover:border-[#667eea]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option.text}</span>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Your responses help us understand and support your wellbeing
              journey
            </p>
          </div>
        </div>
      )}

      {/* Home Dashboard */}
      {currentScreen === "home" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 content-with-bottom-nav">
          <div className="text-center space-y-3 mb-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: `linear-gradient(to right, ${colors.bgGradientTo}, ${colors.cardBg})`,
              }}
            >
              <Sparkles style={{ color: colors.primary }} size={18} />
              <span
                className="text-sm font-medium"
                style={{ color: colors.textPrimary }}
              >
                Day {streaks.journal || 0}
              </span>
            </div>
            <div className="flex justify-center">
              <h1
                className="text-3xl font-bold inline-flex items-center gap-2"
                style={{ lineHeight: "1.3" }}
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour >= 5 && hour < 12) return "Good morning!";
                    if (hour >= 12 && hour < 17) return "Good afternoon!";
                    if (hour >= 17 && hour < 21) return "Good evening!";
                    return "Good night!";
                  })()}
                </span>
                <span style={{ fontSize: "1.75rem" }}>
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour >= 5 && hour < 12) return "✨";
                    if (hour >= 12 && hour < 17) return "☀️";
                    if (hour >= 17 && hour < 21) return "🌆";
                    return "🌙";
                  })()}
                </span>
              </h1>
            </div>
            <p style={{ color: colors.textSecondary }}>
              How are you feeling today?
            </p>
          </div>

          {/* Streak Overview */}
          <Card
            className="p-6 border-0 shadow-lg"
            style={{
              background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent})`,
            }}
          >
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between text-white">
                <h3 className="font-bold text-lg">Your Wellness Streak</h3>
                <Flame className="text-orange-300" size={24} />
              </div>

              <div
                className={`grid ${
                  preferences.journaling ? "grid-cols-3" : "grid-cols-2"
                } gap-4`}
              >
                {preferences.journaling && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                      <BookOpen className="text-white" size={20} />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {streaks.totalEntries}
                    </p>
                    <p className="text-white/80 text-sm">Entries</p>
                  </div>
                )}
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                    <Heart className="text-white" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {streaks.mood}
                  </p>
                  <p className="text-white/80 text-sm">Mood</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                    <Brain className="text-white" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {chatSessions?.length ?? 0}
                  </p>
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
                      <p className="text-white/70 text-sm">
                        Current achievement
                      </p>
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
                <h3 className="font-bold text-gray-800 text-lg">
                  Daily Wellness Check
                </h3>
                <Badge
                  variant="outline"
                  className="border-[#667eea] text-[#667eea] bg-white/50"
                >
                  {dailyWellnessCompleted ? "Completed" : "+1 Streak"}
                </Badge>
              </div>

              {!dailyWellnessCompleted ? (
                <>
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-white/70 rounded-3xl flex items-center justify-center text-4xl shadow-md mx-auto">
                      🌱
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">
                        Let's understand how you're feeling today
                      </p>
                      <p className="text-sm text-gray-600">
                        A few gentle questions to guide your reflection
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setCurrentScreen("mood-questionnaire")}
                    className="w-full text-white rounded-2xl h-12 shadow-lg transform hover:scale-105 transition-all duration-200"
                    style={{
                      background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
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
                      <p className="text-gray-700 font-medium">
                        Today's Mood:{" "}
                        {analyzedMood && getMoodLabel(analyzedMood.mood)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Wellness check completed ✨
                      </p>
                    </div>
                  </div>

                  {analyzedMood && (
                    <div className="bg-white/70 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="text-[#667eea]" size={16} />
                        <span className="font-semibold text-gray-800 text-sm">
                          AI Analysis
                        </span>
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
                      setCurrentScreen("mood-questionnaire");
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
          <div
            className={`grid ${
              preferences.journaling && preferences.aiChat
                ? "grid-cols-2"
                : "grid-cols-1"
            } gap-4`}
          >
            {preferences.journaling && (
              <Button
                onClick={() => setCurrentScreen("new-journal")}
                className="h-28 text-white rounded-3xl flex flex-col gap-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent})`,
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
                onClick={() => setCurrentScreen("ai-chat")}
                className="h-28 text-white rounded-3xl flex flex-col gap-3 shadow-lg transform hover:scale-105 transition-all duration-200"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.secondary}, ${colors.accent})`,
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
                <h3 className="font-bold text-gray-800 text-lg">
                  This Week's Journey
                </h3>
                <TrendingUp className="text-[#68d391]" size={20} />
              </div>
              <div className="h-36 bg-gradient-to-br from-[#f7fafc] to-[#e6f3ff] rounded-2xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodData}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      interval={0}
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis hide domain={[0, 10]} />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#667eea"
                      strokeWidth={4}
                      dot={{
                        r: 6,
                        fill: "#667eea",
                        strokeWidth: 3,
                        stroke: "#ffffff",
                      }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center">
                {moodDataWithValues.length >= 2 ? (
                  <Badge
                    className={
                      moodDataWithValues[moodDataWithValues.length - 1].mood >
                      moodDataWithValues[0].mood
                        ? "bg-[#68d391] text-white"
                        : moodDataWithValues[moodDataWithValues.length - 1]
                            .mood < moodDataWithValues[0].mood
                        ? "bg-orange-500 text-white"
                        : "bg-blue-500 text-white"
                    }
                  >
                    {moodDataWithValues[moodDataWithValues.length - 1].mood >
                    moodDataWithValues[0].mood
                      ? `+${Math.round(
                          ((moodDataWithValues[moodDataWithValues.length - 1]
                            .mood -
                            moodDataWithValues[0].mood) /
                            moodDataWithValues[0].mood) *
                            100
                        )}% improvement this week`
                      : moodDataWithValues[moodDataWithValues.length - 1].mood <
                        moodDataWithValues[0].mood
                      ? `${Math.round(
                          ((moodDataWithValues[0].mood -
                            moodDataWithValues[moodDataWithValues.length - 1]
                              .mood) /
                            moodDataWithValues[0].mood) *
                            100
                        )}% decrease this week`
                      : "Stable mood this week"}
                  </Badge>
                ) : moodDataWithValues.length === 1 ? (
                  <Badge className="bg-blue-500 text-white">
                    Add more entries to see your trend
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
                  <p className="font-semibold text-gray-800">
                    Daily Inspiration
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    {(() => {
                      const inspirations = [
                        "You're doing great today! Remember to be kind to yourself. Every small step counts toward your wellness journey. 💜",
                        "Your feelings are valid, and it's okay to take things one moment at a time. You're stronger than you know. 🌟",
                        "Today is a new opportunity to nurture your mental health. Be gentle with yourself. 🌸",
                        "Remember, progress isn't always linear. Celebrate every small victory along the way. 🎉",
                        "You deserve peace, joy, and all the good things life has to offer. Keep moving forward. 🌈",
                        "Taking care of your mental health is a sign of strength, not weakness. You're doing amazing. 💪",
                        "It's okay to rest. It's okay to take a break. Self-care isn't selfish, it's essential. 🧘",
                        "Your journey is unique, and that's beautiful. Trust the process and be patient with yourself. 🦋",
                        "Even on difficult days, you have the power to choose hope. You've got this! ✨",
                        "Remember to breathe. You're exactly where you need to be right now. 🌿",
                        "Your mental health matters. Thank you for taking time to check in with yourself today. 💖",
                        "Small steps forward are still steps forward. Be proud of how far you've come. 🌱",
                        "You are worthy of love, happiness, and all the beautiful moments life offers. 🌺",
                        "It's okay to feel what you're feeling. Emotions are temporary, but your strength is permanent. 🌊",
                        "Today, choose to be kind to your mind. You deserve compassion and understanding. 🤗",
                        "Every day you prioritize your mental wellness is a day worth celebrating. Keep going! 🎈",
                        "You're not alone on this journey. Your feelings matter, and so do you. 💙",
                        "Take a moment to appreciate yourself. You're doing better than you think. 🌟",
                        "Your mental health journey is a testament to your courage. Be proud of yourself. 🏆",
                        "Remember, healing isn't linear. Every day forward is a victory, no matter how small. 🌤️",
                        "You have survived 100% of your worst days. That's pretty impressive! Keep pushing forward. 💫",
                        "Self-compassion is the first step toward healing. Be as kind to yourself as you are to others. 🌻",
                        "Your story isn't over yet. Keep writing, keep growing, keep healing. 📖",
                        "It's okay to not be okay sometimes. What matters is that you're here, trying. That takes courage. 🦁",
                        "Today's mantra: I am enough. I am worthy. I am deserving of good things. 🌹",
                        "Your mental health journey is valid, important, and worth every effort. Keep believing in yourself. 🌠",
                        "Remember, storms don't last forever. Brighter days are ahead. Hold on. ☀️",
                        "You're making a difference just by showing up for yourself. That's powerful. 🔥",
                        "Celebrate the fact that you're here, doing the work. That alone is something to be proud of. 🎊",
                        "Your resilience is inspiring. Keep nurturing your mental wellness—you're worth it. 💝",
                        "Take pride in prioritizing your mental health. It's one of the bravest things you can do. 🛡️",
                      ];
                      return inspirations[
                        new Date().getDate() % inspirations.length
                      ];
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Journal Page - List View */}
      {currentScreen === "journal" && (
        <div
          className="flex-1 overflow-y-auto p-6 space-y-6 content-with-bottom-nav"
          style={{
            backgroundColor:
              colorContrast === "high"
                ? "#ffffff"
                : colorContrast === "low"
                ? "#fefefd"
                : "#f7fafc",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1
                className="text-3xl font-bold bg-clip-text text-transparent pb-1"
                style={{
                  backgroundImage: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  lineHeight: "1.4",
                }}
              >
                Journal
              </h1>
              <div
                className="flex items-center gap-1 px-3 py-1 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                }}
              >
                <BookOpen className="text-white" size={14} />
                <span className="text-white text-sm font-semibold">
                  {streaks.totalEntries} entries
                </span>
              </div>
            </div>

            <Button
              onClick={() => setCurrentScreen("new-journal")}
              className="w-12 h-12 text-white rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
              style={{
                background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.secondary})`,
              }}
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
                <p style={{ color: colors.textSecondary }}>
                  Loading your journal entries...
                </p>
              </div>
            ) : (
              journalEntries.map((entry) => (
                <Card
                  key={entry._id}
                  className="p-5 border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{
                    backgroundColor: colors.cardBg,
                  }}
                >
                  <CardContent className="p-0 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className="font-semibold"
                            style={{ color: colors.textPrimary }}
                          >
                            {entry.title}
                          </h3>
                          <div className="text-xl">
                            {getEmotionEmoji(entry.mood || 'neutral')}
                          </div>
                        </div>
                        {expandedEntryId !== entry._id && (
                          <p
                            className="text-sm leading-relaxed line-clamp-2"
                            style={{ color: colors.textSecondary }}
                          >
                            {entry.content}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setDeleteDialog({
                            isOpen: true,
                            title: "Delete Journal Entry",
                            message:
                              "Are you sure you want to delete this journal entry? This action cannot be undone.",
                            onConfirm: async () => {
                              await deleteJournalEntry(entry._id);
                              setDeleteDialog({
                                isOpen: false,
                                title: "",
                                message: "",
                                onConfirm: () => {},
                              });
                            },
                          });
                        }}
                        className="flex-shrink-0 hover:bg-red-50 hover:text-red-600 ml-2"
                      >
                        <Trash2
                          className="text-gray-400 hover:text-red-600"
                          size={18}
                        />
                      </Button>
                    </div>

                    {/* Expanded Details */}
                    {expandedEntryId === entry._id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in slide-in-from-top duration-200">
                        {/* Debug ML Analysis */}
                        {console.log('🔍 Expanded entry:', {
                          id: entry._id,
                          title: entry.title,
                          hasMlAnalysis: !!(entry as any).mlAnalysis,
                          mlAnalysisKeys: (entry as any).mlAnalysis ? Object.keys((entry as any).mlAnalysis) : [],
                          mlAnalysis: (entry as any).mlAnalysis
                        })}
                        
                        {/* Full Content */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Journal Entry
                          </h4>
                          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </div>

                        {/* ML Analysis Details */}
                        {(entry as any).mlAnalysis ? (
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
                            <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                              <Brain size={16} />
                              AI Emotion Analysis
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Primary Emotion:
                                </span>
                                <span className="font-semibold text-purple-700 capitalize">
                                  {(entry as any).mlAnalysis.primary_emotion}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Confidence:
                                </span>
                                <span className="font-semibold text-purple-700">
                                  {Math.round(
                                    (entry as any).mlAnalysis
                                      .emotion_confidence * 100
                                  )}
                                  %
                                </span>
                              </div>
                              {(entry as any).mlAnalysis
                                .emotional_state_summary && (
                                <div className="pt-2 border-t border-purple-200">
                                  <span className="text-gray-600">
                                    Summary:{" "}
                                  </span>
                                  <span className="text-purple-700">
                                    {
                                      (entry as any).mlAnalysis
                                        .emotional_state_summary
                                    }
                                  </span>
                                </div>
                              )}
                              {(entry as any).mlAnalysis.detected_emotions
                                ?.length > 0 && (
                                <div className="pt-2">
                                  <span className="text-gray-600 block mb-2">
                                    All Detected Emotions:
                                  </span>
                                  <div className="space-y-1">
                                    {(
                                      entry as any
                                    ).mlAnalysis.detected_emotions.map(
                                      (emotion: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="flex justify-between items-center"
                                        >
                                          <span className="text-purple-600 capitalize text-xs">
                                            {emotion.emotion}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-purple-200 rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-purple-500 rounded-full"
                                                style={{
                                                  width: `${
                                                    emotion.score * 100
                                                  }%`,
                                                }}
                                              />
                                            </div>
                                            <span className="text-xs text-gray-600 w-12 text-right">
                                              {Math.round(emotion.score * 100)}%
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-sm text-gray-500 italic">
                              No ML emotion analysis available for this entry.
                            </p>
                          </div>
                        )}

                        {/* Keystroke Analysis */}
                        {(entry as any).keystrokeData && (
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl">
                            <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                              ⌨️ Typing Behavior Analysis
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {(entry as any).keystrokeData
                                .total_keystrokes && (
                                <div>
                                  <span className="text-gray-600">
                                    Total Keystrokes:
                                  </span>
                                  <p className="font-semibold text-blue-700">
                                    {
                                      (entry as any).keystrokeData
                                        .total_keystrokes
                                    }
                                  </p>
                                </div>
                              )}
                              {(entry as any).keystrokeData.typing_duration && (
                                <div>
                                  <span className="text-gray-600">
                                    Duration:
                                  </span>
                                  <p className="font-semibold text-blue-700">
                                    {Math.round(
                                      (entry as any).keystrokeData
                                        .typing_duration
                                    )}{" "}
                                    seconds
                                  </p>
                                </div>
                              )}
                              {(entry as any).keystrokeData.avg_wpm && (
                                <div>
                                  <span className="text-gray-600">
                                    Typing Speed:
                                  </span>
                                  <p className="font-semibold text-blue-700">
                                    {(entry as any).keystrokeData.avg_wpm} WPM
                                  </p>
                                </div>
                              )}
                              {(entry as any).keystrokeData.pause_count !==
                                undefined && (
                                <div>
                                  <span className="text-gray-600">Pauses:</span>
                                  <p className="font-semibold text-blue-700">
                                    {(entry as any).keystrokeData.pause_count}
                                  </p>
                                </div>
                              )}
                              {(entry as any).keystrokeData.error_rate !==
                                undefined && (
                                <div>
                                  <span className="text-gray-600">
                                    Error Rate:
                                  </span>
                                  <p className="font-semibold text-blue-700">
                                    {(entry as any).keystrokeData.error_rate}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Tags
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {entry.tags?.map((tag: string) => (
                              <Badge
                                key={tag}
                                className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="pt-5 pb-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              Created:{" "}
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              {entry.isPrivate ? (
                                <span>🔒</span>
                              ) : (
                                <span>🌍</span>
                              )}{" "}
                              {entry.isPrivate ? "Private" : "Public"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Collapsed View - Tags and Date with Expand Button */}
                    {expandedEntryId !== entry._id && (
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap items-center">
                          {entry.tags?.slice(0, 3).map((tag: string) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs border-[#667eea]/30 text-[#667eea]"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {entry.tags && entry.tags.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-xs border-gray-300 text-gray-500"
                            >
                              +{entry.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
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
                          <span className="text-xs text-purple-600 font-medium">
                            Show less
                          </span>
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

          {(!journalEntries || journalEntries.length === 0) && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] rounded-3xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-[#667eea]" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Start Your Journey
              </h3>
              <p className="text-gray-600 mb-6">
                Your first journal entry awaits. Share what's on your heart.
              </p>
              <Button
                onClick={() => setCurrentScreen("new-journal")}
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
      {currentScreen === "new-journal" && (
        <div className="flex-1 overflow-y-auto flex flex-col content-with-bottom-nav">
          <div className="p-6 space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setCurrentScreen("journal")}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowRight className="rotate-180" size={20} />
              </Button>
              <h1 className="text-xl font-bold text-gray-800">New Entry</h1>
              <div className="w-10"></div>
            </div>

            <div className="p-3 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-2xl">
              <p className="text-sm text-[#667eea] font-semibold">
                💭{" "}
                {dailyPrompts[Math.floor(Math.random() * dailyPrompts.length)]}
              </p>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="Give your entry a title..."
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
                className={`rounded-2xl h-12 shadow-md text-base font-medium ${
                  colorContrast === "high"
                    ? "bg-white text-black border-2 border-gray-800 placeholder:text-gray-500"
                    : colorContrast === "low"
                    ? "bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400"
                    : "bg-white text-gray-900 border-0 placeholder:text-gray-400"
                }`}
              />

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-200">
                <p className="text-xs text-purple-700 flex items-center gap-2">
                  <Brain size={14} />
                  <span>AI will detect your emotion from your writing</span>
                </p>
              </div>

              <Textarea
                placeholder="What's on your mind today? Share your thoughts, feelings, or experiences... ✨"
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                className={`h-72 rounded-2xl resize-none text-sm p-4 shadow-md leading-relaxed ${
                  colorContrast === "high"
                    ? "bg-white text-black border-2 border-gray-800 placeholder:text-gray-500"
                    : colorContrast === "low"
                    ? "bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400"
                    : "bg-white text-gray-900 border-0 placeholder:text-gray-400"
                }`}
              />
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            <div className="text-center py-2">
              <p className="text-xs text-gray-400">
                This is your safe space...
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Express yourself freely 🔒
              </p>
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
                      tags: ["reflection"],
                      isPrivate: true,
                      keystrokeData: keystrokeMetrics || undefined,
                    });

                    // Reset form
                    setJournalText("");
                    setJournalTitle("");
                    resetKeystrokes();

                    // Streak will be recalculated when entries are fetched
                    setCurrentScreen("journal");
                  } catch (error) {
                    // Error already handled in createJournalEntry
                  }
                } else {
                  alert(
                    "Please add both a title and content to your journal entry."
                  );
                }
              }}
              disabled={
                isSavingJournal || !journalText.trim() || !journalTitle.trim()
              }
              className="w-full bg-gradient-to-r from-[#667eea] to-[#5a67d8] hover:from-[#5a67d8] hover:to-[#4c51bf] text-white rounded-2xl h-14 shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSavingJournal ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <div className="text-left">
                    <p className="font-semibold">Analyzing your entry...</p>
                    <p className="text-xs text-white/80">
                      Detecting emotions with AI
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <FileText size={20} className="mr-2" />
                  <div className="text-left">
                    <p className="font-semibold">Save Entry with AI Analysis</p>
                    <p className="text-xs text-white/80">+1 streak day</p>
                  </div>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Insights Page */}
      {false && (
        <Card className="p-5 bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] border-0 shadow-lg">
          <CardContent className="p-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/50 rounded-xl flex items-center justify-center">
                <Sparkles className="text-[#667eea]" size={16} />
              </div>
              <span className="font-semibold text-gray-800">AI Insights</span>
            </div>
            <p className="text-gray-700 leading-relaxed">
              I can sense the thoughtfulness in your words. Your willingness to
              reflect shows real emotional wisdom. Consider what emotions are
              most present as you write - they often hold important messages for
              your growth.
            </p>
            <div className="flex gap-2 pt-2">
              <Badge
                variant="outline"
                className="text-xs border-[#667eea] text-[#667eea]"
              >
                Self-awareness
              </Badge>
              <Badge
                variant="outline"
                className="text-xs border-[#f093fb] text-[#f093fb]"
              >
                Emotional processing
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Page */}
      {currentScreen === "insights" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 content-with-bottom-nav">
          <div className="text-center space-y-3">
            <h1
              className="text-3xl font-bold bg-clip-text text-transparent pb-1"
              style={{
                backgroundImage: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                lineHeight: "1.4",
              }}
            >
              Insights
            </h1>
            <p style={{ color: colors.textSecondary }}>
              Your mental wellness patterns
            </p>
          </div>

          {/* Streak Progress & Achievements */}
          <Card
            className="p-6 border-0 shadow-lg"
            style={{
              background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent})`,
            }}
          >
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
                        <p className="text-white/70">
                          Current achievement unlocked!
                        </p>
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
                        <span className="text-white font-medium">
                          Next Goal
                        </span>
                      </div>
                      <span className="text-white text-sm">
                        {getMaxStreak()}/
                        {getNextMilestone(getMaxStreak())?.days}
                      </span>
                    </div>
                    <Progress
                      value={
                        (getMaxStreak() /
                          (getNextMilestone(getMaxStreak())?.days || 1)) *
                        100
                      }
                      className="mb-2 [&>div]:bg-gradient-to-r [&>div]:from-[#667eea] [&>div]:to-[#f093fb]"
                    />
                    <p className="text-white/80 text-sm">
                      {(getNextMilestone(getMaxStreak())?.days || 0) -
                        getMaxStreak()}{" "}
                      days to {getNextMilestone(getMaxStreak())?.title}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Goal-Based Achievements */}
          <Card className="p-6 shadow-lg border-0">
            <CardContent className="p-0 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-lg">
                  Goal Achievements
                </h3>
                <Badge className="bg-[#667eea] text-white">
                  {getUnlockedAchievements().length}/{goalAchievements.length}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  // Sort achievements: completed first, then by goal
                  const sortedAchievements = [...goalAchievements].sort(
                    (a, b) => {
                      if (a.achieved && !b.achieved) return -1;
                      if (!a.achieved && b.achieved) return 1;
                      return a.goal - b.goal;
                    }
                  );

                  // Show only top 3 achievements + "View More" button if collapsed
                  const displayAchievements = showAllAchievements
                    ? sortedAchievements
                    : sortedAchievements.slice(0, 3);

                  return (
                    <>
                      {displayAchievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          className="p-5 rounded-2xl transition-all"
                          style={{
                            border: achievement.achieved
                              ? colorContrast === "high"
                                ? "2px solid #6b21a8"
                                : colorContrast === "low"
                                ? "2px solid #d8b4fe"
                                : "2px solid #667eea"
                              : colorContrast === "high"
                              ? "3px solid #6b7280"
                              : colorContrast === "low"
                              ? "1px solid #d1d5db"
                              : "2px solid #e5e7eb",
                            background: achievement.achieved
                              ? colorContrast === "high"
                                ? "linear-gradient(to bottom right, #e9d5ff, #fbcfe8)"
                                : colorContrast === "low"
                                ? "linear-gradient(to bottom right, #faf5ff, #fce7f3)"
                                : "linear-gradient(to bottom right, #e6f3ff, #fed7e2)"
                              : colorContrast === "high"
                              ? "#e5e7eb"
                              : colorContrast === "low"
                              ? "#f3f4f6"
                              : "#f9fafb",
                            boxShadow: achievement.achieved
                              ? colorContrast === "high"
                                ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                                : colorContrast === "low"
                                ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                                : "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                              : "none",
                            opacity: achievement.achieved
                              ? 1
                              : colorContrast === "high"
                              ? 0.7
                              : colorContrast === "low"
                              ? 0.5
                              : 0.6,
                          }}
                        >
                          <div className="text-center space-y-3">
                            <div
                              className={`text-4xl mb-2 ${
                                achievement.achieved
                                  ? "grayscale-0"
                                  : "grayscale opacity-50"
                              }`}
                            >
                              {achievement.icon}
                            </div>

                            <div className="space-y-1">
                              <p
                                className={`font-bold text-base leading-tight ${
                                  colorContrast === "high"
                                    ? achievement.achieved
                                      ? "text-gray-900"
                                      : "text-gray-700"
                                    : colorContrast === "low"
                                    ? achievement.achieved
                                      ? "text-gray-700"
                                      : "text-gray-500"
                                    : achievement.achieved
                                    ? "text-gray-800"
                                    : "text-gray-500"
                                }`}
                              >
                                {achievement.title}
                              </p>
                              <p
                                className={`text-xs leading-tight ${
                                  colorContrast === "high"
                                    ? achievement.achieved
                                      ? "text-gray-700"
                                      : "text-gray-600"
                                    : colorContrast === "low"
                                    ? achievement.achieved
                                      ? "text-gray-500"
                                      : "text-gray-400"
                                    : achievement.achieved
                                    ? "text-gray-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {achievement.description}
                              </p>
                            </div>
                            {achievement.achieved ? (
                              <div
                                className="text-xs font-bold px-4 py-1.5 rounded-full inline-block border-0"
                                style={{
                                  backgroundColor: "#16a34a",
                                  color: "white",
                                }}
                              >
                                ✓ UNLOCKED
                              </div>
                            ) : (
                              <div
                                className={`text-sm font-bold mt-2 px-3 py-1.5 rounded-full inline-block ${
                                  colorContrast === "high"
                                    ? "bg-gray-300 text-gray-900"
                                    : colorContrast === "low"
                                    ? "bg-gray-200 text-gray-600"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {achievement.type === "entries" &&
                                  `${journalEntries?.length ?? 0}/${
                                    achievement.goal
                                  }`}
                                {achievement.type === "chats" &&
                                  `${chatSessions?.length ?? 0}/${
                                    achievement.goal
                                  }`}
                                {achievement.type === "positivity" &&
                                  `${positivityScore}%/${achievement.goal}%`}
                                {achievement.type === "weekly" &&
                                  `${streaks.journal}/${achievement.goal} days`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* View More / View Less Button */}
                      {!showAllAchievements &&
                        sortedAchievements.length > 3 && (
                          <div
                            onClick={() => setShowAllAchievements(true)}
                            className="p-4 rounded-2xl border-2 border-dashed border-[#667eea] bg-gradient-to-br from-[#f7fafc] to-[#e6f3ff] hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                          >
                            <div className="w-12 h-12 rounded-full bg-[#667eea] flex items-center justify-center">
                              <ChevronRight className="text-white" size={24} />
                            </div>
                            <p className="font-semibold text-sm text-[#667eea]">
                              View More
                            </p>
                            <p className="text-xs text-gray-500">
                              {sortedAchievements.length - 3} more
                            </p>
                          </div>
                        )}

                      {showAllAchievements && (
                        <div
                          onClick={() => setShowAllAchievements(false)}
                          className="p-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center">
                            <ChevronRight
                              className="text-white transform rotate-180"
                              size={24}
                            />
                          </div>
                          <p className="font-semibold text-sm text-gray-600">
                            Show Less
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Streak Stats */}
          <Card className="p-6 shadow-lg border-0">
            <CardContent className="p-0 space-y-5">
              <h3 className="font-bold text-gray-800 text-lg">
                Streak Statistics
              </h3>

              <div className="space-y-4">
                {preferences.journaling && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#e6f3ff] to-[#f7fafc] rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#667eea] rounded-xl flex items-center justify-center">
                        <BookOpen className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          Journal Entries
                        </p>
                        <p className="text-sm text-gray-600">
                          Total reflections
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#667eea]">
                        {streaks.totalEntries}
                      </p>
                      <p className="text-xs text-gray-500">entries</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#fed7e2] to-[#f7fafc] rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f093fb] rounded-xl flex items-center justify-center">
                      <Heart className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Mood Tracking
                      </p>
                      <p className="text-sm text-gray-600">Daily check-ins</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#f093fb]">
                      {streaks.mood}
                    </p>
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
                      <p className="text-sm text-gray-600">AI sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#764ba2]">
                      {chatSessions?.length ?? 0}
                    </p>
                    <p className="text-xs text-gray-500">sessions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood trends */}
          <Card className="p-6 shadow-lg border-0">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-lg">
                  Mood Trends (Last 7 Days)
                </h3>
                <Badge
                  className={
                    moodDataWithValues.length >= 2 &&
                    moodDataWithValues[moodDataWithValues.length - 1].mood >
                      moodDataWithValues[0].mood
                      ? "bg-[#68d391] text-white"
                      : moodDataWithValues.length >= 2 &&
                        moodDataWithValues[moodDataWithValues.length - 1].mood <
                          moodDataWithValues[0].mood
                      ? "bg-orange-500 text-white"
                      : "bg-blue-500 text-white"
                  }
                >
                  {moodDataWithValues.length >= 2
                    ? moodDataWithValues[moodDataWithValues.length - 1].mood >
                      moodDataWithValues[0].mood
                      ? "Improving"
                      : moodDataWithValues[moodDataWithValues.length - 1].mood <
                        moodDataWithValues[0].mood
                      ? "Declining"
                      : "Stable"
                    : "Tracking"}
                </Badge>
              </div>
              <div className="h-52 bg-gradient-to-br from-[#f7fafc] to-[#e6f3ff] rounded-2xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodData}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      padding={{ left: 10, right: 10 }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis domain={[0, 10]} hide />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#667eea"
                      strokeWidth={4}
                      dot={{
                        r: 6,
                        fill: "#667eea",
                        strokeWidth: 3,
                        stroke: "#ffffff",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Emotion breakdown */}
          <Card className="p-6 shadow-lg border-0">
            <CardContent className="p-0 space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">
                Emotion Analysis
              </h3>
              <div className="bg-gradient-to-br from-[#f7fafc] to-[#fed7e2] rounded-2xl p-4">
                {emotionData && emotionData.length > 0 ? (
                  <div style={{ width: "100%", height: "240px" }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={emotionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          dataKey="value"
                          paddingAngle={3}
                        >
                          {emotionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-60 flex items-center justify-center">
                    <div className="text-center">
                      <Brain className="text-gray-400 mx-auto mb-3" size={48} />
                      <p className="text-gray-600 font-medium">
                        No emotion data yet
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        Start journaling to see your emotional patterns
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {emotionData && emotionData.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {emotionData.map((emotion) => (
                    <div
                      key={emotion.name}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl"
                    >
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: emotion.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {emotion.name} {emotion.value}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
                  <h3 className="font-bold text-gray-800 text-lg">
                    Mood Forecast
                  </h3>
                  <p className="text-gray-600 text-sm">AI-powered prediction</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {!journalEntries || journalEntries.length === 0
                  ? "Start journaling to see personalized insights and mood predictions based on your emotional patterns."
                  : dominantEmotion === null
                  ? "Keep journaling to build a comprehensive emotional profile. We'll provide personalized insights as you track more entries."
                  : positivityScore >= 70
                  ? `Your emotional landscape is flourishing! ${getEmotionEmoji(
                      dominantEmotion
                    )} You're experiencing predominantly ${dominantEmotion} emotions. Your consistent journaling is creating positive momentum. Keep nurturing your mental wellness!`
                  : positivityScore >= 50
                  ? `You're maintaining a balanced emotional state with ${dominantEmotion} ${getEmotionEmoji(
                      dominantEmotion
                    )} as your current mood tendency. Continue your self-care practices and be mindful of your emotional needs.`
                  : positivityScore >= 30
                  ? `Your recent entries show some emotional challenges with ${dominantEmotion} ${getEmotionEmoji(
                      dominantEmotion
                    )} emerging as a pattern. This is okay - remember to be kind to yourself. Consider reaching out to supportive friends or our AI companion.`
                  : `You seem to be going through a difficult time with recurring ${dominantEmotion} ${getEmotionEmoji(
                      dominantEmotion
                    )} feelings. Your feelings are valid. Please consider talking to a mental health professional or using our AI support for guidance.`}
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Positivity Score
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      positivityScore >= 70
                        ? "text-[#68d391]"
                        : positivityScore >= 50
                        ? "text-blue-500"
                        : positivityScore >= 30
                        ? "text-orange-500"
                        : "text-red-500"
                    }`}
                  >
                    {positivityScore}%
                  </span>
                </div>
                <Progress
                  value={positivityScore}
                  className={`h-3 [&>div]:bg-gradient-to-r ${
                    positivityScore >= 70
                      ? "[&>div]:from-[#68d391] [&>div]:to-[#667eea]"
                      : positivityScore >= 50
                      ? "[&>div]:from-blue-400 [&>div]:to-blue-600"
                      : positivityScore >= 30
                      ? "[&>div]:from-orange-400 [&>div]:to-orange-600"
                      : "[&>div]:from-red-400 [&>div]:to-red-600"
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Therapist Chat */}
      {currentScreen === "ai-chat" && (
        <div
          className="flex flex-col flex-1 overflow-hidden relative"
          style={{
            backgroundColor:
              colorContrast === "high"
                ? "#ffffff"
                : colorContrast === "low"
                ? "#fefefd"
                : "#f7fafc",
          }}
        >
          <div
            className="p-6 border-b flex-shrink-0"
            style={{
              background: colors.cardBg,
              borderBottomColor: colors.accent,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src="" />
                    <AvatarFallback
                      className="text-white"
                      style={{
                        background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.secondary})`,
                      }}
                    >
                      <Brain size={20} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1
                    className="font-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    Eunoia AI
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    Your empathetic wellness companion
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Start new chat
                    setCurrentSessionId(null);
                    currentSessionIdRef.current = null;
                    setChatMessages([
                      {
                        role: "ai",
                        content:
                          "Hello! I'm your wellness companion. How are you feeling today?",
                      },
                    ]);
                  }}
                  className="flex items-center gap-2"
                  title="Start New Chat"
                >
                  <Plus size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fetchChatSessions();
                    setShowChatHistory(true);
                  }}
                  className="flex items-center gap-2"
                  title="Chat History"
                >
                  <History size={20} />
                </Button>
              </div>
            </div>
          </div>

          <div
            className="flex-1 p-6 space-y-4 overflow-y-auto pb-80"
            style={{ paddingBottom: "320px" }}
          >
            {chatMessages.map((message, index) => {
              // Clean and format message content
              const formatMessage = (text: string) => {
                // Aggressive cleaning of the text
                let cleaned = text
                  // Remove ** at start of line followed by newline
                  .replace(/^\*\*\s*$/gm, "")
                  // Remove ** followed by newline
                  .replace(/\*\*\s*\n/g, "")
                  // Remove newline followed by **
                  .replace(/\n\s*\*\*\s*$/gm, "")
                  // Remove lines with only ** and whitespace
                  .replace(/^\s*\*\*\s*$/gm, "")
                  // Clean up spacing around bullets
                  .replace(/\s*•\s*/g, "\n• ")
                  // Add single line break before section headers (not double)
                  .replace(
                    /(Emergency Services:|International Resources:|City-Specific Helplines:|National 24\/7 Helplines:)/g,
                    "\n$1"
                  )
                  // Remove excessive line breaks (more than 2 consecutive)
                  .replace(/\n{3,}/g, "\n\n")
                  // Trim each line
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line.length > 0)
                  .join("\n")
                  .trim();

                const parts: React.ReactNode[] = [];
                const lines = cleaned.split("\n");

                lines.forEach((line, lineIndex) => {
                  if (lineIndex > 0) {
                    parts.push(<br key={`br-${lineIndex}`} />);
                  }

                  // Process bold text and URLs in each line
                  const lineParts = line.split(
                    /(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/
                  );
                  lineParts.forEach((part, partIndex) => {
                    if (!part) return;

                    if (part.startsWith("**") && part.endsWith("**")) {
                      // Bold text
                      parts.push(
                        <strong key={`${lineIndex}-${partIndex}`}>
                          {part.slice(2, -2)}
                        </strong>
                      );
                    } else if (
                      part.startsWith("http://") ||
                      part.startsWith("https://")
                    ) {
                      // URL
                      parts.push(
                        <a
                          key={`url-${lineIndex}-${partIndex}`}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline break-all"
                        >
                          {part}
                        </a>
                      );
                    } else {
                      parts.push(part);
                    }
                  });
                });

                return parts;
              };

              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {message.role === "ai" && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback
                        style={{
                          background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.secondary})`,
                          color: "#ffffff",
                        }}
                      >
                        <Brain size={12} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[85%] p-4 rounded-3xl ${
                      colorContrast === "high" ? "shadow-lg" : "shadow-sm"
                    }`}
                    style={
                      message.role === "user"
                        ? {
                            background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.secondary})`,
                            color: "#ffffff",
                            border:
                              colorContrast === "high"
                                ? "2px solid rgba(0,0,0,0.3)"
                                : "none",
                          }
                        : {
                            backgroundColor: colors.cardBg,
                            border:
                              colorContrast === "high"
                                ? `2px solid ${colors.accent}`
                                : `1px solid ${colors.accent}`,
                            color: colors.textPrimary,
                          }
                    }
                  >
                    <div className="leading-relaxed break-words">
                      {formatMessage(message.content)}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Invisible element at the end for auto-scroll */}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {(!chatMessages || chatMessages.length <= 1) && (
            <div
              className="p-4 border-t"
              style={{
                backgroundColor: colors.cardBg,
                borderTopColor: colors.accent,
              }}
            >
              <p
                className="text-sm font-medium mb-3"
                style={{ color: colors.textPrimary }}
              >
                Try asking about:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.slice(0, 3).map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => sendMessage(prompt)}
                    className={`text-xs rounded-full h-8 ${
                      colorContrast === "high" ? "border-2" : ""
                    }`}
                    style={{
                      borderColor: colors.accent,
                      color: colors.primary,
                      backgroundColor:
                        colorContrast === "low" ? colors.cardBg : "transparent",
                    }}
                  >
                    <Lightbulb size={12} className="mr-1" />
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div
            className="fixed bottom-20 left-0 right-0 border-t max-w-md mx-auto"
            style={{
              backgroundColor:
                colorContrast === "high"
                  ? "#ffffff"
                  : colorContrast === "low"
                  ? "#fefefd"
                  : "#f7fafc",
              borderTopColor: colors.accent,
            }}
          >
            {/* Additional suggested prompts */}
            <div className="p-4 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {suggestedPrompts.slice(3).map((prompt, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => sendMessage(prompt)}
                    className={`text-xs rounded-full whitespace-nowrap h-8 flex-shrink-0 ${
                      colorContrast === "high" ? "border-2" : ""
                    }`}
                    style={{
                      backgroundColor:
                        colorContrast === "low"
                          ? colors.cardBg
                          : `${colors.primary}15`,
                      color: colors.primary,
                      borderColor:
                        colorContrast === "high"
                          ? colors.accent
                          : "transparent",
                    }}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>

            <div
              className="flex gap-3 p-4 pt-2"
              style={{ backgroundColor: colors.cardBg }}
            >
              <Input
                placeholder="Share what's on your heart..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className={`flex-1 rounded-2xl h-12 ${
                  colorContrast === "high"
                    ? "bg-white text-black border-2 border-gray-800 placeholder:text-gray-500"
                    : colorContrast === "low"
                    ? "bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400"
                    : "bg-gray-50 text-gray-900 border-gray-200 placeholder:text-gray-400"
                }`}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!newMessage.trim()}
                className="rounded-2xl w-12 h-12 p-0 flex items-center justify-center text-white"
                style={
                  colorContrast === "high"
                    ? {
                        background: "#4c1d95",
                        border: "2px solid #000",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
                      }
                    : colorContrast === "low"
                    ? {
                        background: "linear-gradient(to right, #8b9ce6, #f5b8d9)",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                      }
                    : {
                        background: "linear-gradient(to right, #667eea, #f093fb)",
                        boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
                      }
                }
              >
                <Send size={20} />
              </Button>
            </div>
          </div>

          {/* Chat History Bottom Drawer */}
          {showChatHistory && (
            <>
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/40 z-[9998] animate-in fade-in duration-200"
                onClick={() => setShowChatHistory(false)}
              />

              {/* Bottom Drawer */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[9999] flex flex-col animate-in slide-in-from-bottom duration-300"
                style={{
                  height: "70vh",
                  maxHeight: "700px",
                  paddingBottom: "80px",
                }}
              >
                <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
                  <h2 className="text-xl font-bold text-gray-800">
                    Chat History
                  </h2>
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
                  {!chatSessions || chatSessions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="text-[#667eea]" size={32} />
                      </div>
                      <p className="text-gray-600">No previous chats yet</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Start a conversation to see your chat history
                      </p>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <Card
                        key={session.sessionId}
                        className="p-4 hover:shadow-lg transition-all duration-200"
                      >
                        <CardContent className="p-0">
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setCurrentSessionId(session.sessionId);
                                currentSessionIdRef.current = session.sessionId; // Update ref
                                loadChatSession(session.sessionId);
                                setShowChatHistory(false);
                              }}
                            >
                              <h3 className="font-semibold text-gray-800 line-clamp-2">
                                {session.title && session.title !== "New Chat"
                                  ? session.title
                                  : `Conversation at ${new Date(
                                      session.createdAt || session.lastMessageAt
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}`}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(
                                  session.lastMessageAt
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChatSession(session.sessionId);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete chat"
                              >
                                <Trash2 size={18} />
                              </button>
                              <ChevronRight
                                className="text-gray-400"
                                size={18}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                <div className="p-6 border-t flex-shrink-0">
                  <Button
                    onClick={() => {
                      setCurrentSessionId(null);
                      currentSessionIdRef.current = null; // Clear ref
                      setChatMessages([
                        {
                          role: "ai",
                          content:
                            "Hello! I'm your wellness companion. How are you feeling today?",
                        },
                      ]);
                      setShowChatHistory(false);
                      // Don't create empty session - will be created when user sends first message
                    }}
                    className="w-full rounded-2xl h-12 text-white"
                    style={
                      colorContrast === "high"
                        ? {
                            background: "#4c1d95",
                            border: "2px solid #000",
                            boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
                          }
                        : colorContrast === "low"
                        ? {
                            background: "linear-gradient(to right, #8b9ce6, #f5b8d9)",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                          }
                        : {
                            background: "linear-gradient(to right, #667eea, #f093fb)",
                            boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
                          }
                    }
                  >
                    <Plus size={18} className="mr-2" />
                    Start New Chat
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Profile & Settings */}
      {currentScreen === "profile" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 content-with-bottom-nav">
          <div className="text-center space-y-4">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarImage src="" />
              <AvatarFallback className="bg-[#667eea] text-white text-2xl">
                {currentUser?.name
                  ? currentUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {currentUser?.name || "User"}
              </h1>
              <p className="text-gray-600">{currentUser?.email || ""}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="text-[#667eea]" size={24} />
                  <div>
                    <p className="font-medium">Journaling Reminders</p>
                    <p className="text-sm text-gray-600">
                      {preferences.notifications
                        ? `Daily at ${new Date(
                            `2000-01-01T${preferences.notificationTime}`
                          ).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : "Disabled"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.notifications}
                  onCheckedChange={async (checked: boolean) => {
                    setPreferences((prev) => ({
                      ...prev,
                      notifications: checked,
                    }));
                    if (checked) {
                      const success = await scheduleNotification(
                        preferences.notificationTime
                      );
                      if (!success) {
                        setPreferences((prev) => ({
                          ...prev,
                          notifications: false,
                        }));
                        alert(
                          "Please enable notifications in your device settings."
                        );
                      }
                    } else {
                      await cancelNotification();
                    }
                  }}
                />
              </div>
              {preferences.notifications && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Time
                  </label>
                  <Input
                    type="time"
                    value={preferences.notificationTime}
                    onChange={async (e) => {
                      const newTime = e.target.value;
                      setPreferences((prev) => ({
                        ...prev,
                        notificationTime: newTime,
                      }));
                      if (preferences.notifications) {
                        await scheduleNotification(newTime);
                      }
                    }}
                    className="w-full rounded-xl"
                  />
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-[#667eea]" size={24} />
                  <div>
                    <p className="font-medium">Journal Entry</p>
                    <p className="text-sm text-gray-600">
                      Enable daily journaling feature
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.journaling}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences((prev) => ({ ...prev, journaling: checked }))
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
                    <p className="text-sm text-gray-600">
                      Enable wellness companion chat
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.aiChat}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences((prev) => ({ ...prev, aiChat: checked }))
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
                    <p className="text-sm text-gray-600">
                      Adjust colors for your comfort
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setColorContrast("high")}
                    className="text-xs rounded-xl h-16 flex flex-col gap-1"
                    style={{
                      borderWidth: colorContrast === "high" ? "2px" : "1px",
                      borderColor:
                        colorContrast === "high" ? "#5b21b6" : "#e5e7eb",
                      backgroundColor:
                        colorContrast === "high" ? "#f0f9ff" : "white",
                      color: colorContrast === "high" ? "#5b21b6" : "#6b7280",
                    }}
                  >
                    <div className="w-6 h-6 bg-[#5b21b6] rounded-lg"></div>
                    <span className="font-medium">High</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setColorContrast("standard")}
                    className="text-xs rounded-xl h-16 flex flex-col gap-1"
                    style={{
                      borderWidth: colorContrast === "standard" ? "2px" : "1px",
                      borderColor:
                        colorContrast === "standard" ? "#667eea" : "#e5e7eb",
                      backgroundColor:
                        colorContrast === "standard" ? "#e6f3ff" : "white",
                      color:
                        colorContrast === "standard" ? "#667eea" : "#6b7280",
                    }}
                  >
                    <div className="w-6 h-6 bg-[#667eea] rounded-lg"></div>
                    <span className="font-medium">Standard</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setColorContrast("low")}
                    className="text-xs rounded-xl h-16 flex flex-col gap-1"
                    style={{
                      borderWidth: colorContrast === "low" ? "2px" : "1px",
                      borderColor:
                        colorContrast === "low" ? "#a8b3d1" : "#e5e7eb",
                      backgroundColor:
                        colorContrast === "low" ? "#fdfcfd" : "white",
                      color: colorContrast === "low" ? "#4a4d5a" : "#6b7280",
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
              onClick={() => setCurrentScreen("privacy")}
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
      {currentScreen === "privacy" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 content-with-bottom-nav">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentScreen("profile")}
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
                Your privacy is important to us. All your data is stored
                securely and is only accessible to you.
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
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
            </div>

            <Button
              className="w-full rounded-2xl !bg-red-600 hover:!bg-red-700 !text-white font-semibold"
              onClick={async () => {
                if (
                  window.confirm(
                    "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted."
                  )
                ) {
                  try {
                    const { authService } = await import(
                      "./services/api.service"
                    );
                    await authService.deleteAccount();
                    alert("Your account has been deleted successfully.");
                    setCurrentUser(null);
                    setCurrentScreen("login");
                  } catch (error: any) {
                    alert(
                      error.response?.data?.message ||
                        "Failed to delete account. Please try again."
                    );
                  }
                }
              }}
            >
              Delete My Account and Data
            </Button>
          </Card>
        </div>
      )}

      <BottomNav
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        preferences={preferences}
      />

      {/* Custom Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <div
          className="fixed bg-black/50 backdrop-blur-sm z-[10000]"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() =>
            setDeleteDialog({
              isOpen: false,
              title: "",
              message: "",
              onConfirm: () => {},
            })
          }
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200"
            style={{ maxWidth: "380px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {deleteDialog.title}
                  </h3>
                  <p className="text-xs text-gray-600">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-gray-700 leading-relaxed text-center">
                {deleteDialog.message}
              </p>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 flex gap-3">
              <button
                className="flex-1 h-12 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold transition-colors text-sm"
                onClick={() =>
                  setDeleteDialog({
                    isOpen: false,
                    title: "",
                    message: "",
                    onConfirm: () => {},
                  })
                }
              >
                Cancel
              </button>
              <button
                className="flex-1 h-12 rounded-xl text-white font-semibold shadow-lg transition-colors text-sm"
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#b91c1c")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#dc2626")
                }
                onClick={deleteDialog.onConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentalHealthApp;
