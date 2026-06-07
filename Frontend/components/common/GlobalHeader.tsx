'use client';

import { useState, useEffect, useRef } from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Icon from '../UI/AppIcon';
import { useToast } from '../UI/Toast';

interface GlobalHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
}

const GlobalHeader = ({ onRefresh, isLoading = false, dateRange: externalDateRange, onDateRangeChange }: GlobalHeaderProps) => {
  const router = useRouter();

  const dateRange = externalDateRange || 'last-7-days';
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [connectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  const [darkMode, setDarkMode] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const dateRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { toasts, markAsRead, markAllAsRead, getUnreadCount } = useToast();

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node))
        setIsDateDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setIsNotificationDropdownOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setIsUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const handleDateRangeChange = (value: string) => {
    setIsDateDropdownOpen(false);
    onDateRangeChange?.(value);
  };

  const handleRefresh = () => {
    if (onRefresh && !isLoading) onRefresh();
  };

  const unreadCount = getUnreadCount();

  const connectionColor =
    connectionStatus === 'connected' ? 'bg-emerald-500' :
    connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-amber-500';

  const connectionLabel =
    connectionStatus === 'connected' ? 'Live Data' :
    connectionStatus === 'disconnected' ? 'Disconnected' : 'Connecting…';

  return (
    <header className="sticky top-0 z-40 bg-bg-secondary border-b border-border-primary shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between h-20 px-8">

        {}
        <div className="flex items-center gap-4">

          {}
          <div className="relative" ref={dateRef}>
            <button
              onClick={() => setIsDateDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors border border-border-primary"
              aria-label="Select date range"
            >
              <Icon name="CalendarIcon" size={20} className="text-text-secondary" />
              <span className="font-sans font-medium text-sm text-text-primary">
                {dateRangeOptions.find(o => o.value === dateRange)?.label}
              </span>
              <Icon
                name="ChevronDownIcon"
                size={16}
                className={`text-text-secondary transition-transform duration-200 ${isDateDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-bg-secondary border border-border-primary rounded-xl shadow-lg z-50">
                <div className="py-2">
                  {dateRangeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleDateRangeChange(option.value)}
                      className={`w-full px-4 py-2 text-left font-sans text-sm transition-colors hover:bg-bg-primary ${
                        dateRange === option.value ? 'text-nobel-gold font-medium bg-bg-primary/50' : 'text-text-primary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-primary/50 border border-border-primary">
            <div className={`w-2 h-2 rounded-full ${connectionColor} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
            <span className="font-sans text-xs text-text-secondary">{connectionLabel}</span>
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">

          {}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-bg-primary transition-colors text-text-primary"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isLoading
                ? 'bg-bg-primary/50 cursor-not-allowed text-text-secondary'
                : 'bg-bg-primary hover:bg-bg-primary/80 shadow-sm border border-border-primary text-text-secondary hover:text-text-primary'
            }`}
            aria-label="Refresh data"
          >
            <Icon name="ArrowPathIcon" size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotificationDropdownOpen(o => !o)}
              className="relative p-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 border border-border-primary transition-colors shadow-sm text-text-secondary hover:text-text-primary"
              aria-label="View notifications"
            >
              <Icon name="BellIcon" size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-bg-secondary rounded-full" />
              )}
            </button>

            {isNotificationDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-bg-primary border border-border-primary rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-border-primary flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => { markAllAsRead(); setIsNotificationDropdownOpen(false); }}
                      className="text-xs text-nobel-gold hover:text-nobel-gold/80 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {toasts.length === 0 ? (
                    <p className="p-4 text-center text-sm text-text-secondary">No notifications</p>
                  ) : (
                    toasts.map(toast => (
                      <div
                        key={toast.id}
                        onClick={() => markAsRead(toast.id)}
                        className={`p-4 border-b border-border-primary hover:bg-bg-secondary cursor-pointer transition-colors ${!toast.isRead ? 'bg-bg-primary/50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            toast.type === 'success' ? 'bg-green-500' :
                            toast.type === 'error' ? 'bg-red-500' :
                            toast.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm text-text-primary ${!toast.isRead ? 'font-semibold' : 'font-medium'}`}>
                              {toast.title}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">{toast.message}</p>
                          </div>
                          {!toast.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {}
          <div className="relative ml-2" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(o => !o)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg bg-bg-primary hover:bg-bg-primary/80 border border-border-primary transition-colors"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-md bg-nobel-gold/20 flex items-center justify-center">
                <Icon name="UserIcon" size={16} className="text-nobel-gold" />
              </div>
              <Icon
                name="ChevronDownIcon"
                size={16}
                className={`text-text-secondary transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-bg-primary border border-border-primary rounded-lg shadow-lg z-50">
                <button
                  onClick={() => { setIsUserMenuOpen(false); router.push('/profile'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors rounded-lg"
                >
                  <LogOut size={15} />
                  Back to Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
