import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { 
  Play, 
  Pause, 
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

type ExerciseType = 'breathing' | 'meditation' | null;

export const MeditationScreen: React.FC = () => {
  const { updateStreak } = useApp();
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [sound, setSound] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(5);

  const exercises = [
    {
      type: 'breathing' as ExerciseType,
      title: 'Box Breathing',
      description: '4-4-4-4 breathing pattern for calm and focus',
      duration: '2-10 min',
      icon: '🫁',
      color: 'from-blue-400 to-cyan-400'
    },
    {
      type: 'meditation' as ExerciseType,
      title: 'Guided Meditation',
      description: 'Peaceful meditation with gentle guidance',
      duration: '5-20 min',
      icon: '🧘',
      color: 'from-purple-400 to-pink-400'
    }
  ];

  // Breathing exercise timer
  useEffect(() => {
    if (!isPlaying || selectedExercise !== 'breathing') return;

    const interval = setInterval(() => {
      setTimer(prev => {
        const newTime = prev + 1;
        
        // Box breathing: 4 seconds each phase
        const phase = Math.floor((newTime % 16) / 4);
        if (phase === 0) setBreathPhase('inhale');
        else if (phase === 1) setBreathPhase('hold');
        else if (phase === 2) setBreathPhase('exhale');
        else setBreathPhase('hold');

        // Count completed breath cycles
        if (newTime % 16 === 0 && newTime > 0) {
          setBreathCount(prev => prev + 1);
        }

        // Stop after selected duration
        if (newTime >= selectedDuration * 60) {
          setIsPlaying(false);
          updateStreak('meditation');
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, selectedExercise, selectedDuration]);

  // Meditation timer
  useEffect(() => {
    if (!isPlaying || selectedExercise !== 'meditation') return;

    const interval = setInterval(() => {
      setTimer(prev => {
        const newTime = prev + 1;
        if (newTime >= selectedDuration * 60) {
          setIsPlaying(false);
          updateStreak('meditation');
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, selectedExercise, selectedDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBreathScale = () => {
    const phaseTime = timer % 4;
    if (breathPhase === 'inhale') return 1 + (phaseTime * 0.5);
    if (breathPhase === 'exhale') return 3 - (phaseTime * 0.5);
    return breathPhase === 'hold' && Math.floor((timer % 16) / 4) === 1 ? 3 : 1;
  };

  const resetExercise = () => {
    setIsPlaying(false);
    setTimer(0);
    setBreathCount(0);
    setBreathPhase('inhale');
  };

  const getBreathInstruction = () => {
    const phaseTime = timer % 4;
    const remaining = 4 - phaseTime;
    
    if (breathPhase === 'inhale') return `Breathe In... ${remaining}`;
    if (breathPhase === 'exhale') return `Breathe Out... ${remaining}`;
    if (Math.floor((timer % 16) / 4) === 1) return `Hold... ${remaining}`;
    return `Hold... ${remaining}`;
  };

  // Exercise selection view
  if (!selectedExercise) {
    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#f093fb] bg-clip-text text-transparent">
            Mindfulness
          </h1>
          <p className="text-gray-600">Find your peace with guided exercises</p>
        </div>

        <div className="space-y-4">
          {exercises.map((exercise) => (
            <Card
              key={exercise.type}
              className="overflow-hidden border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all"
              onClick={() => setSelectedExercise(exercise.type)}
            >
              <CardContent className={`p-6 bg-gradient-to-r ${exercise.color}`}>
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{exercise.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{exercise.title}</h3>
                    <p className="text-white/90 text-sm mb-2">{exercise.description}</p>
                    <p className="text-white/80 text-xs font-medium">{exercise.duration}</p>
                  </div>
                  <Play className="text-white" size={24} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="p-6 bg-gradient-to-br from-[#ffecd2] to-[#fcb69f] border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="text-[#764ba2]" size={24} />
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-2">Daily Practice</p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Regular mindfulness practice can reduce stress, improve focus, and enhance emotional well-being. Even just 5 minutes a day makes a difference!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exercise in progress view
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] flex flex-col p-6">
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={() => {
            resetExercise();
            setSelectedExercise(null);
          }}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft size={20} />
        </Button>
        <button
          onClick={() => setSound(!sound)}
          className="text-white hover:bg-white/10 p-2 rounded-full"
        >
          {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        {/* Breathing animation */}
        {selectedExercise === 'breathing' && (
          <>
            <div className="relative">
              <div
                className="w-64 h-64 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center transition-all duration-1000 ease-in-out"
                style={{
                  transform: `scale(${getBreathScale()})`,
                }}
              >
                <div className="text-center text-white">
                  <p className="text-3xl font-bold mb-2">{getBreathInstruction()}</p>
                  <p className="text-white/80">{breathPhase.toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="text-center text-white space-y-2">
              <p className="text-lg font-semibold">Breath Cycles: {breathCount}</p>
              <p className="text-white/80 text-sm">
                Inhale 4s • Hold 4s • Exhale 4s • Hold 4s
              </p>
            </div>
          </>
        )}

        {/* Meditation view */}
        {selectedExercise === 'meditation' && (
          <>
            <div className="w-64 h-64 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center">
              <div className="text-center text-white">
                <p className="text-4xl mb-2">🧘</p>
                <p className="text-lg font-semibold">Breathe deeply</p>
                <p className="text-white/80 text-sm mt-2">Let thoughts pass by</p>
              </div>
            </div>

            <div className="text-center text-white space-y-2 max-w-xs">
              <p className="text-white/90 leading-relaxed">
                Focus on your breath. Notice the present moment without judgment.
              </p>
            </div>
          </>
        )}

        {/* Timer and controls */}
        <div className="w-full max-w-xs space-y-4">
          <div className="text-center">
            <p className="text-white text-4xl font-bold mb-2">{formatTime(timer)}</p>
            <Progress 
              value={(timer / (selectedDuration * 60)) * 100} 
              className="h-2 bg-white/20 [&>div]:bg-white"
            />
            <p className="text-white/80 text-sm mt-2">
              {formatTime(selectedDuration * 60 - timer)} remaining
            </p>
          </div>

          {/* Duration selector (only when not playing) */}
          {!isPlaying && timer === 0 && (
            <div className="flex justify-center gap-2">
              {[2, 5, 10, 15, 20].map((duration) => (
                <button
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    selectedDuration === duration
                      ? 'bg-white text-[#667eea] scale-110'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {duration}m
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-16 h-16 rounded-full bg-white text-[#667eea] hover:bg-white/90 shadow-lg"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </Button>
            <Button
              onClick={resetExercise}
              className="w-16 h-16 rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <RotateCcw size={24} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
