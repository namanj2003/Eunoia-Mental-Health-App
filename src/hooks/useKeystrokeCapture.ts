import { useState, useCallback, useRef } from 'react';

interface KeystrokeEvent {
  key: string;
  keydown_time: number;
  keyup_time?: number;
  event_type: 'keydown' | 'keyup';
}

interface KeystrokeMetrics {
  total_keystrokes: number;
  typing_duration: number;
  avg_wpm: number;
  pause_count: number;
  error_rate: number;
}

export const useKeystrokeCapture = () => {
  const [keystrokeData, setKeystrokeData] = useState<KeystrokeEvent[]>([]);
  const keystrokeBuffer = useRef<KeystrokeEvent[]>([]);
  const startTime = useRef<number | null>(null);
  const keyDownTimes = useRef<Map<string, number>>(new Map());

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const now = performance.now();
    
    // Start timing on first keystroke
    if (!startTime.current) {
      startTime.current = now;
    }

    // Record keydown time
    keyDownTimes.current.set(event.key, now);

    const keystroke: KeystrokeEvent = {
      key: event.key,
      keydown_time: now,
      event_type: 'keydown'
    };

    keystrokeBuffer.current.push(keystroke);
  }, []);

  const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
    const now = performance.now();
    const keydownTime = keyDownTimes.current.get(event.key);

    if (keydownTime) {
      // Find the corresponding keydown event and add keyup time
      const lastKeystroke = keystrokeBuffer.current[keystrokeBuffer.current.length - 1];
      if (lastKeystroke && lastKeystroke.key === event.key) {
        lastKeystroke.keyup_time = now;
      }

      keyDownTimes.current.delete(event.key);
    }
  }, []);

  const calculateMetrics = useCallback((): KeystrokeMetrics | null => {
    const data = keystrokeBuffer.current;
    
    if (data.length < 5) {
      return null; // Not enough data
    }

    const firstTime = data[0]?.keydown_time || 0;
    const lastTime = data[data.length - 1]?.keyup_time || data[data.length - 1]?.keydown_time || 0;
    const duration = (lastTime - firstTime) / 1000; // Convert to seconds

    // Calculate pauses (gaps > 2 seconds)
    let pauseCount = 0;
    for (let i = 1; i < data.length; i++) {
      const gap = (data[i].keydown_time - (data[i-1].keyup_time || data[i-1].keydown_time)) / 1000;
      if (gap > 2.0) {
        pauseCount++;
      }
    }

    // Count deletions/corrections
    const deleteCount = data.filter(k => 
      k.key === 'Backspace' || k.key === 'Delete'
    ).length;

    // Calculate WPM (assuming average word length of 5 characters)
    const wordCount = data.length / 5;
    const minutes = duration / 60;
    const wpm = minutes > 0 ? wordCount / minutes : 0;

    // Error rate
    const errorRate = data.length > 0 ? deleteCount / data.length : 0;

    return {
      total_keystrokes: data.length,
      typing_duration: duration,
      avg_wpm: Math.round(wpm * 100) / 100,
      pause_count: pauseCount,
      error_rate: Math.round(errorRate * 10000) / 100 // Percentage with 2 decimals
    };
  }, []);

  const reset = useCallback(() => {
    keystrokeBuffer.current = [];
    startTime.current = null;
    keyDownTimes.current.clear();
    setKeystrokeData([]);
  }, []);

  const getMetrics = useCallback(() => {
    setKeystrokeData(keystrokeBuffer.current);
    return calculateMetrics();
  }, [calculateMetrics]);

  return {
    handleKeyDown,
    handleKeyUp,
    getMetrics,
    reset,
    keystrokeData
  };
};
