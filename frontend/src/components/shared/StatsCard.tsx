import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  color?: 'blue' | 'purple' | 'pink' | 'green' | 'yellow' | 'orange' | 'red';
  onClick?: () => void;
}

const colorClasses = {
  blue: 'border-neon-blue/20 hover:border-neon-blue/40',
  purple: 'border-neon-purple/20 hover:border-neon-purple/40',
  pink: 'border-neon-pink/20 hover:border-neon-pink/40',
  green: 'border-neon-green/20 hover:border-neon-green/40',
  yellow: 'border-neon-yellow/20 hover:border-neon-yellow/40',
  orange: 'border-orange-500/20 hover:border-orange-500/40',
  red: 'border-red-500/20 hover:border-red-500/40',
};

const iconColors = {
  blue: 'text-neon-blue',
  purple: 'text-neon-purple',
  pink: 'text-neon-pink',
  green: 'text-neon-green',
  yellow: 'text-neon-yellow',
  orange: 'text-orange-400',
  red: 'text-red-400',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  onClick,
}: StatsCardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`glass rounded-2xl p-6 border-2 transition-all ${colorClasses[color]} ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        {icon && <div className={`text-2xl ${iconColors[color]}`}>{icon}</div>}
      </div>
      <p className="text-4xl font-bold mb-2">{value}</p>
      {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      {trend && (
        <div className={`text-sm mt-2 ${trend.isPositive !== false ? 'text-green-400' : 'text-red-400'}`}>
          {trend.isPositive !== false ? '↑' : '↓'} {trend.value}% {trend.label}
        </div>
      )}
    </Component>
  );
}
