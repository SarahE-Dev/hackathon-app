import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  id: string;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, id }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeConfig = {
    success: {
      bgColor: 'bg-green-500/20 border-neon-green/50',
      textColor: 'text-neon-green',
      icon: CheckCircle,
    },
    error: {
      bgColor: 'bg-neon-pink/20 border-neon-pink/50',
      textColor: 'text-neon-pink',
      icon: AlertCircle,
    },
    info: {
      bgColor: 'bg-neon-blue/20 border-neon-blue/50',
      textColor: 'text-neon-blue',
      icon: Info,
    },
    warning: {
      bgColor: 'bg-neon-yellow/20 border-neon-yellow/50',
      textColor: 'text-neon-yellow',
      icon: AlertTriangle,
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border
        ${config.bgColor}
        backdrop-blur-sm
        animate-slide-up
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.textColor}`} />
      <p className={`flex-1 text-sm font-medium ${config.textColor}`}>{message}</p>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>;
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};
