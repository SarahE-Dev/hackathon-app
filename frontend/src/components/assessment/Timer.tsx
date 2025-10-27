'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface TimerProps {
  secondsRemaining: number;
  onTimeUp: () => void;
  warningAt?: number; // seconds - when to show warning
}

export const Timer: React.FC<TimerProps> = ({ secondsRemaining, onTimeUp, warningAt = 300 }) => {
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onTimeUp();
      return;
    }

    setIsWarning(secondsRemaining <= warningAt && secondsRemaining > 60);
    setIsCritical(secondsRemaining <= 60);
  }, [secondsRemaining, warningAt, onTimeUp]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getColorClass = () => {
    if (isCritical) return 'text-neon-pink';
    if (isWarning) return 'text-neon-yellow';
    return 'text-neon-blue';
  };

  const getIconClass = () => {
    if (isCritical) return 'animate-pulse';
    return '';
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800/50 border border-dark-700 ${getColorClass()}`}>
      {isCritical ? (
        <AlertTriangle className={`w-5 h-5 ${getIconClass()}`} />
      ) : (
        <Clock className="w-5 h-5" />
      )}
      <span className="font-mono font-bold text-lg">{formatTime()}</span>
      {isCritical && <span className="text-xs ml-2 opacity-75">TIME RUNNING OUT</span>}
    </div>
  );
};
