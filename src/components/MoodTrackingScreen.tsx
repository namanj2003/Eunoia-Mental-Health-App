import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Heart, 
  TrendingUp, 
  Calendar,
  ArrowLeft,
  Sparkles,
  Award,
  Target
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatDate, getLastNDays, calculatePercentage } from '../utils/helpers';

export const MoodTrackingScreen: React.FC = () => {
  const { moodEntries, addMoodEntry, streaks } = useApp();
  const [view, setView] = useState<'overview' | 'checkin'>('overview');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: string}>({});

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
        { text: "Happy and optimistic", value: "happy", mood: 9 }
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

  const calculateMoodFromAnswers = () => {
    const moodScores = Object.entries(answers).map(([questionIndex, answer]) => {
      const question = moodQuestions[parseInt(questionIndex)];
      return question?.options.find(opt => opt.value === answer)?.mood || 5;
    });
    
    return moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
  };

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQuestion]: value };
    setAnswers(newAnswers);
    
    if (currentQuestion < moodQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Complete check-in
      const avgMood = calculateMoodFromAnswers();
      const emotion = avgMood >= 8 ? 'joyful' : avgMood >= 6 ? 'content' : avgMood >= 4 ? 'neutral' : 'struggling';
      
      addMoodEntry({
        date: new Date().toISOString().split('T')[0],
        mood: Math.round(avgMood),
        emotion,
        energyLevel: answers[0],
        socialConnection: answers[2],
      });
      
      setView('overview');
      setCurrentQuestion(0);
      setAnswers({});
    }
  };

  // Calculate analytics
  const last7Days = useMemo(() => getLastNDays(7), []);
  
  const moodChartData = useMemo(() => {
    return last7Days.map(day => {
      const dayEntries = moodEntries.filter(e => e.date === day);
      const avgMood = dayEntries.length > 0
        ? dayEntries.reduce((sum, e) => sum + e.mood, 0) / dayEntries.length
        : 0;
      
      return {
        date: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        mood: avgMood
      };
    });
  }, [moodEntries, last7Days]);

  const emotionDistribution = useMemo(() => {
    const emotions = moodEntries.reduce((acc, entry) => {
      acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors: Record<string, string> = {
      joyful: '#68d391',
      content: '#667eea',
      neutral: '#a0aec0',
      anxious: '#f6ad55',
      struggling: '#f093fb'
    };

    return Object.entries(emotions).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: colors[name] || '#a0aec0'
    }));
  }, [moodEntries]);

  const averageMood = useMemo(() => {
    if (moodEntries.length === 0) return 0;
    return moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length;
  }, [moodEntries]);

  const getMoodLabel = (mood: number) => {
    if (mood >= 8) return 'Excellent';
    if (mood >= 7) return 'Good';
    if (mood >= 5) return 'Neutral';
    if (mood >= 3) return 'Low';
    return 'Struggling';
  };

  const todayEntry = moodEntries.find(e => e.date === new Date().toISOString().split('T')[0]);

  // Check-in View
  if (view === 'checkin') {
    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              setView('overview');
              setCurrentQuestion(0);
              setAnswers({});
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} />
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
                  onClick={() => handleAnswer(option.value)}
                  className="w-full p-4 text-left rounded-2xl border-2 transition-all hover:scale-105 hover:border-[#667eea] hover:bg-[#e6f3ff]"
                >
                  <span className="font-medium">{option.text}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overview
  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#f093fb] bg-clip-text text-transparent">
          Mood Insights
        </h1>
        <p className="text-gray-600">Track your emotional wellness journey</p>
      </div>

      {/* Daily Check-in Card */}
      {!todayEntry ? (
        <Card className="p-6 bg-gradient-to-br from-[#e6f3ff] via-[#fed7e2] to-[#ffecd2] border-0 shadow-lg">
          <CardContent className="p-0 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg">Daily Wellness Check</h3>
              <Badge variant="outline" className="border-[#667eea] text-[#667eea] bg-white/50">
                +1 Streak
              </Badge>
            </div>
            
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
              onClick={() => setView('checkin')}
              className="w-full bg-gradient-to-r from-[#667eea] to-[#f093fb] hover:from-[#5a67d8] hover:to-[#e879f9] text-white rounded-2xl h-12 shadow-lg"
            >
              <Heart className="mr-2" size={20} />
              Start Wellness Check
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-to-br from-[#68d391] to-[#667eea] border-0 shadow-lg">
          <CardContent className="p-0 text-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Today's Check-in</h3>
              <div className="text-3xl">✨</div>
            </div>
            <div>
              <p className="text-2xl font-bold">{getMoodLabel(todayEntry.mood)}</p>
              <p className="text-white/90">Mood Score: {todayEntry.mood}/10</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak Stats */}
      <Card className="p-6 bg-gradient-to-br from-[#667eea] to-[#764ba2] border-0 shadow-lg">
        <CardContent className="p-0 space-y-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Tracking Streak</h3>
            <Award className="text-yellow-300" size={24} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold">{streaks.mood}</p>
              <p className="text-white/80">Days in a row</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{moodEntries.length}</p>
              <p className="text-white/80 text-sm">Total check-ins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mood Trend */}
      {moodChartData.some(d => d.mood > 0) && (
        <Card className="p-6 shadow-lg border-0">
          <CardContent className="p-0 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg">7-Day Mood Trend</h3>
              <TrendingUp className="text-[#68d391]" size={20} />
            </div>
            <div className="h-52 bg-gradient-to-br from-[#f7fafc] to-[#e6f3ff] rounded-2xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodChartData}>
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
            {averageMood > 0 && (
              <div className="flex justify-center">
                <Badge className="bg-[#68d391] text-white">
                  Average: {averageMood.toFixed(1)}/10
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Emotion Distribution */}
      {emotionDistribution.length > 0 && (
        <Card className="p-6 shadow-lg border-0">
          <CardContent className="p-0 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">Emotion Analysis</h3>
            <div className="h-52 bg-gradient-to-br from-[#f7fafc] to-[#fed7e2] rounded-2xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={emotionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {emotionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {emotionDistribution.map((emotion) => (
                <div key={emotion.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: emotion.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {emotion.name} ({emotion.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
