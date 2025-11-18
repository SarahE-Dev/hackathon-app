import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  message?: string;
  color?: 'blue' | 'purple' | 'pink' | 'green';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const colorClasses = {
  blue: 'border-neon-blue',
  purple: 'border-neon-purple',
  pink: 'border-neon-pink',
  green: 'border-neon-green',
};

export default function LoadingSpinner({
  size = 'md',
  fullScreen = false,
  message,
  color = 'blue',
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="text-center">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} border-4 border-t-transparent rounded-full animate-spin mx-auto`}
      ></div>
      {message && <p className="text-gray-400 mt-4">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        {spinner}
      </div>
    );
  }

  return spinner;
}
