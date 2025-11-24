import React from 'react';

type StatusType =
  | 'active' | 'scheduled' | 'paused' | 'completed' | 'cancelled'
  | 'pending' | 'submitted' | 'graded' | 'passed' | 'failed'
  | 'in_progress' | 'not_started' | 'expired'
  | 'low' | 'medium' | 'high' | 'critical';

type SizeType = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: SizeType;
  withIcon?: boolean;
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; border: string; icon?: string }> = {
  // Session/Assessment statuses
  active: {
    bg: 'bg-neon-green/20',
    text: 'text-neon-green',
    border: 'border-neon-green/50',
    icon: '🟢',
  },
  scheduled: {
    bg: 'bg-neon-blue/20',
    text: 'text-neon-blue',
    border: 'border-neon-blue/50',
    icon: '⏰',
  },
  paused: {
    bg: 'bg-neon-yellow/20',
    text: 'text-neon-yellow',
    border: 'border-neon-yellow/50',
    icon: '⏸️',
  },
  completed: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
    icon: '✅',
  },
  cancelled: {
    bg: 'bg-neon-pink/20',
    text: 'text-neon-pink',
    border: 'border-neon-pink/50',
    icon: '❌',
  },

  // Attempt/Submission statuses
  pending: {
    bg: 'bg-neon-yellow/20',
    text: 'text-neon-yellow',
    border: 'border-neon-yellow/50',
    icon: '⏳',
  },
  submitted: {
    bg: 'bg-neon-blue/20',
    text: 'text-neon-blue',
    border: 'border-neon-blue/50',
    icon: '📤',
  },
  graded: {
    bg: 'bg-neon-purple/20',
    text: 'text-neon-purple',
    border: 'border-neon-purple/50',
    icon: '✓',
  },
  passed: {
    bg: 'bg-neon-green/20',
    text: 'text-neon-green',
    border: 'border-neon-green/50',
    icon: '✓',
  },
  failed: {
    bg: 'bg-neon-pink/20',
    text: 'text-neon-pink',
    border: 'border-neon-pink/50',
    icon: '✗',
  },
  in_progress: {
    bg: 'bg-neon-blue/20',
    text: 'text-neon-blue',
    border: 'border-neon-blue/50',
    icon: '▶️',
  },
  not_started: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
    icon: '○',
  },
  expired: {
    bg: 'bg-neon-orange/20',
    text: 'text-neon-orange',
    border: 'border-neon-orange/50',
    icon: '⚠️',
  },

  // Risk/Severity levels
  low: {
    bg: 'bg-neon-green/20',
    text: 'text-neon-green',
    border: 'border-neon-green/50',
  },
  medium: {
    bg: 'bg-neon-yellow/20',
    text: 'text-neon-yellow',
    border: 'border-neon-yellow/50',
  },
  high: {
    bg: 'bg-neon-orange/20',
    text: 'text-neon-orange',
    border: 'border-neon-orange/50',
  },
  critical: {
    bg: 'bg-neon-pink/20',
    text: 'text-neon-pink',
    border: 'border-neon-pink/50',
  },
};

const sizeClasses: Record<SizeType, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export default function StatusBadge({
  status,
  size = 'md',
  withIcon = false,
  className = '',
}: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const config = statusConfig[normalizedStatus] || {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
  };

  const displayText = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');

  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${sizeClasses[size]}
        ${config.bg}
        ${config.text}
        ${config.border}
        border rounded-full font-medium
        ${className}
      `}
    >
      {withIcon && config.icon && <span>{config.icon}</span>}
      {displayText}
    </span>
  );
}

// Export a simple function for quick status colors (useful in existing components)
export function getStatusColors(status: string): { bg: string; text: string; border: string } {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return statusConfig[normalizedStatus] || {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
  };
}
