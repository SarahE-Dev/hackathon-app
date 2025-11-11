'use client';

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  onRemove: (id: string) => void;
}

function Toast({ notification, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Auto-remove after 5 seconds for non-error toasts
    if (notification.type !== 'error') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove(notification.id), 300); // Wait for exit animation
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.type, onRemove]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/50';
      case 'error':
        return 'bg-red-500/10 border-red-500/50';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/50';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/50';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`p-4 rounded-lg border ${getBgColor(notification.type)} shadow-lg backdrop-blur-sm`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white text-sm">{notification.title}</h4>
            <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className="mt-2 text-sm text-neon-blue hover:text-neon-blue/80 underline"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onRemove(notification.id), 300);
            }}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { notifications, removeNotification } = useNotifications();
  const [toasts, setToasts] = useState<typeof notifications>([]);

  // Only show the 3 most recent notifications as toasts
  useEffect(() => {
    setToasts(notifications.slice(0, 3));
  }, [notifications]);

  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none">
      {toasts.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto mb-2"
          style={{ transform: `translateY(${index * 8}px)` }}
        >
          <Toast
            notification={notification}
            onRemove={removeNotification}
          />
        </div>
      ))}
    </div>
  );
}
