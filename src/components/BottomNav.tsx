import React from 'react';
import { Home, BookOpen, BarChart3, MessageCircle, User } from 'lucide-react';

type Screen = 'login' | 'onboarding' | 'home' | 'journal' | 'new-journal' | 'mood-questionnaire' | 'insights' | 'ai-chat' | 'chat-history' | 'profile' | 'privacy';

interface BottomNavProps {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  preferences?: {
    journaling?: boolean;
    aiChat?: boolean;
  };
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, setCurrentScreen, preferences = { journaling: true, aiChat: true } }) => {
  const allNavItems = [
    { screen: 'home' as Screen, icon: Home, label: 'Home', alwaysShow: true },
    { screen: 'journal' as Screen, icon: BookOpen, label: 'Journal', showIf: preferences.journaling },
    { screen: 'insights' as Screen, icon: BarChart3, label: 'Insights', alwaysShow: true },
    { screen: 'ai-chat' as Screen, icon: MessageCircle, label: 'AI Chat', showIf: preferences.aiChat },
    { screen: 'profile' as Screen, icon: User, label: 'Profile', alwaysShow: true }
  ];

  // Filter nav items based on preferences
  const navItems = allNavItems.filter(item => item.alwaysShow || item.showIf);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-4 py-3 max-w-md mx-auto shadow-lg" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <div className="flex justify-around items-center">
        {navItems.map(({ screen, icon: Icon, label }) => (
          <button
            key={screen}
            onClick={() => setCurrentScreen(screen)}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 transform ${
              currentScreen === screen 
                ? 'text-[#667eea] bg-gradient-to-br from-[#e6f3ff] to-[#fed7e2] scale-110 shadow-md' 
                : 'text-gray-500 hover:text-[#667eea] hover:bg-gray-50 hover:scale-105'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};