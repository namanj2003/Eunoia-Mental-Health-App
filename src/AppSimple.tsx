import React, { useState } from 'react';
import { useApp } from './contexts/AppContext';
import { LoginScreenEnhanced } from './components/LoginScreenEnhanced';
import { JournalScreen } from './components/JournalScreen';
import { MoodTrackingScreen } from './components/MoodTrackingScreen';
import { MeditationScreen } from './components/MeditationScreen';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Switch } from './components/ui/switch';
import { 
  Heart, 
  BookOpen, 
  BarChart3, 
  MessageCircle, 
  User,
  Plus,
  Flame,
  Brain,
  Sparkles,
  TrendingUp,
  Settings,
  Shield,
  ArrowRight
} from 'lucide-react';
import { getGreeting, formatDate } from './utils/helpers';

type Screen = 'home' | 'journal' | 'insights' | 'ai-chat' | 'profile' | 'meditation';

const App: React.FC = () => {
  const { isAuthenticated, user, logout, journalEntries, moodEntries, streaks, preferences, updatePreferences } = useApp();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  // If not authenticated, show login
  if (!isAuthenticated) {
    return <LoginScreenEnhanced onLoginSuccess={() => {}} />;
  }

  // Meditation screen (full screen, no bottom nav)
  if (currentScreen === 'meditation') {
    return <MeditationScreen />;
  }

  // Main app content
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fafbff] to-[#e6f3ff] max-w-md mx-auto pb-20">
      {/* Home Screen */}
      {currentScreen === 'home' && (
        <div className="p-6 space-y-6">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] rounded-full">
              <Sparkles className="text-[#667eea]" size={18} />
              <span className="text-sm font-medium text-gray-700">
                Day {Math.max(streaks.journal, streaks.mood)}
              </span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#f093fb] bg-clip-text text-transparent">
              {getGreeting()}! ✨
            </h1>
            <p className="text-gray-600">How are you feeling today?</p>
          </div>

          {/* Streak Overview */}
          <Card className="p-6 bg-gradient-to-br from-[#667eea] to-[#764ba2] border-0 shadow-lg">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between text-white">
                <h3 className="font-bold text-lg">Your Wellness Streak</h3>
                <Flame className="text-orange-300" size={24} />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                    <BookOpen className="text-white" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-white">{streaks.journal}</p>
                  <p className="text-white/80 text-sm">Journal</p>
                </div>
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
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => setCurrentScreen('journal')}
              className="h-28 bg-gradient-to-br from-[#667eea] to-[#5a67d8] hover:from-[#5a67d8] hover:to-[#4c51bf] text-white rounded-3xl flex flex-col gap-3 shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Plus size={24} />
              </div>
              <div className="text-center">
                <p className="font-semibold">New Entry</p>
                <p className="text-xs text-white/80">Express yourself</p>
              </div>
            </Button>
            <Button 
              onClick={() => setCurrentScreen('meditation')}
              className="h-28 bg-gradient-to-br from-[#f093fb] to-[#e879f9] hover:from-[#e879f9] hover:to-[#d946ef] text-white rounded-3xl flex flex-col gap-3 shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Brain size={24} />
              </div>
              <div className="text-center">
                <p className="font-semibold">Meditate</p>
                <p className="text-xs text-white/80">Find peace</p>
              </div>
            </Button>
          </div>

          {/* Recent Activity */}
          <Card className="p-6 shadow-lg border-0 bg-white">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-lg">Recent Activity</h3>
                <TrendingUp className="text-[#68d391]" size={20} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <BookOpen className="text-[#667eea]" size={20} />
                    <div>
                      <p className="font-medium text-sm">Journal Entries</p>
                      <p className="text-xs text-gray-500">Total recorded</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#667eea]">{journalEntries.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Heart className="text-[#f093fb]" size={20} />
                    <div>
                      <p className="font-medium text-sm">Mood Check-ins</p>
                      <p className="text-xs text-gray-500">Total tracked</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#f093fb]">{moodEntries.length}</span>
                </div>
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

      {/* Journal Screen */}
      {currentScreen === 'journal' && <JournalScreen />}

      {/* Insights Screen */}
      {currentScreen === 'insights' && <MoodTrackingScreen />}

      {/* AI Chat Screen */}
      {currentScreen === 'ai-chat' && (
        <div className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-gradient-to-br from-[#667eea] to-[#f093fb] rounded-3xl flex items-center justify-center mx-auto">
              <Brain className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#f093fb] bg-clip-text text-transparent">
              AI Companion
            </h1>
            <p className="text-gray-600">Coming soon!</p>
          </div>
          <Card className="p-6 bg-gradient-to-r from-[#e6f3ff] to-[#fed7e2] border-0">
            <CardContent className="p-0 text-center">
              <p className="text-gray-700">
                Our compassionate AI companion is being trained to provide you with empathetic support and guidance.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Screen */}
      {currentScreen === 'profile' && (
        <div className="p-6 space-y-6">
          <div className="text-center space-y-4">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarFallback className="bg-[#667eea] text-white text-2xl">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{user?.name || 'User'}</h1>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-sm text-gray-500 mt-1">Member since {formatDate(user?.joinDate || new Date().toISOString())}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="text-[#667eea]" size={24} />
                  <div>
                    <p className="font-medium">Journaling Reminders</p>
                    <p className="text-sm text-gray-600">Daily at {preferences.reminderTime}</p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.reminders} 
                  onCheckedChange={(checked: boolean) => updatePreferences({ reminders: checked })} 
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="text-[#764ba2]" size={24} />
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
              onClick={logout}
              variant="outline" 
              className="w-full rounded-2xl border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-4 py-3 max-w-md mx-auto shadow-lg">
        <div className="flex justify-around items-center">
          {[
            { screen: 'home' as Screen, icon: Heart, label: 'Home' },
            { screen: 'journal' as Screen, icon: BookOpen, label: 'Journal' },
            { screen: 'insights' as Screen, icon: BarChart3, label: 'Insights' },
            { screen: 'ai-chat' as Screen, icon: MessageCircle, label: 'AI Chat' },
            { screen: 'profile' as Screen, icon: User, label: 'Profile' }
          ].map(({ screen, icon: Icon, label }) => (
            <button
              key={screen}
              onClick={() => setCurrentScreen(screen)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
                currentScreen === screen
                  ? 'text-[#667eea] bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] scale-110 shadow-md'
                  : 'text-gray-500 hover:text-[#667eea] hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
