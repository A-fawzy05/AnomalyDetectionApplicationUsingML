'use client';

import React, { useState, useRef, createContext, useContext, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  isRead?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const counterRef = useRef(0);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${counterRef.current++}`;

    const newToast: Toast = {
      ...toast,
      id,
      isRead: false,
      duration: toast.duration || 5000,
    };
    
    setToasts(prev => [newToast, ...prev]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const markAsRead = (id: string) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isRead: true } : toast
    ));
  };

  const markAllAsRead = () => {
    setToasts(prev => prev.map(toast => ({ ...toast, isRead: true })));
  };

  const getUnreadCount = () => {
    return toasts.filter(toast => !toast.isRead).length;
  };

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      showToast: addToast,
      removeToast,
      markAsRead,
      markAllAsRead,
      getUnreadCount,
    }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast, markAsRead } = useToast();

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`relative p-4 rounded-lg border shadow-lg transition-all duration-300 transform ${getToastStyles(toast.type)} ${
            !toast.isRead ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
          }`}
          onClick={() => markAsRead(toast.id)}
        >
          <div className="flex items-start gap-3">
            {getIcon(toast.type)}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {toast.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {toast.message}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="shrink-0 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          {!toast.isRead && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </div>
      ))}
    </div>
  );
};
