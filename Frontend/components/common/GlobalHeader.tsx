'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import Icon from '../UI/AppIcon';

interface GlobalHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

const GlobalHeader = ({ onRefresh, isLoading = false }: GlobalHeaderProps) => {
  const [dateRange, setDateRange] = useState('last-7-days');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Sync with existing dark class on mount
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    setIsDateDropdownOpen(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleRefresh = () => {
    if (onRefresh && !isLoading) {
      onRefresh();
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-emerald-500';
      case 'disconnected': return 'bg-red-500';
      case 'connecting': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live Data';
      case 'disconnected': return 'Disconnected';
      case 'connecting': return 'Connecting...';
      default: return 'Unknown';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-bg-secondary border-b border-border-primary shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between h-20 px-8">
        {/* Left Section - Date Range Selector */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors border border-border-primary"
              aria-label="Select date range"
              aria-expanded={isDateDropdownOpen}
            >
              <Icon name="CalendarIcon" size={20} className="text-text-secondary" />
              <span className="font-sans font-medium text-sm text-text-primary">
                {dateRangeOptions.find(opt => opt.value === dateRange)?.label}
              </span>
              <Icon
                name="ChevronDownIcon"
                size={16}
                className={`text-text-secondary transition-transform duration-200 ${
                  isDateDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDateDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDateDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-56 bg-bg-secondary border border-border-primary rounded-xl shadow-lg z-50 animate-fade-in-up">
                  <div className="py-2">
                    {dateRangeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleDateRangeChange(option.value)}
                        className={`
                          w-full px-4 py-2 text-left font-sans text-sm
                          transition-colors hover:bg-bg-primary
                          ${dateRange === option.value
                            ? 'text-nobel-gold font-medium bg-bg-primary/50' : 'text-text-primary'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-primary/50 border border-border-primary">
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()} ${
              connectionStatus === 'connected' ? 'animate-pulse' : ''
            }`} />
            <span className="font-sans text-xs text-text-secondary">
              {getConnectionStatusText()}
            </span>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-bg-primary transition-colors text-text-primary"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`
              p-2 rounded-lg transition-all duration-200
              ${isLoading
                ? 'bg-bg-primary/50 cursor-not-allowed text-text-secondary' 
                : 'bg-bg-primary hover:bg-bg-primary/80 hover:-translate-y-0.5 shadow-sm border border-border-primary text-text-secondary hover:text-text-primary'
              }
            `}
            aria-label="Refresh data"
          >
            <Icon
              name="ArrowPathIcon"
              size={20}
              className={`${isLoading ? 'animate-spin' : ''}`}
            />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 border border-border-primary transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-text-secondary hover:text-text-primary"
            aria-label="View notifications"
          >
            <Icon name="BellIcon" size={20} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-bg-secondary rounded-full" />
          </button>

          {/* Settings */}
          <button
            className="p-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 border border-border-primary transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-text-secondary hover:text-text-primary"
            aria-label="Open settings"
          >
            <Icon name="Cog6ToothIcon" size={20} />
          </button>

          {/* User Menu */}
          <button
            className="flex items-center gap-2 pl-1 pr-3 py-1 ml-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 border border-border-primary transition-all duration-200"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-md bg-nobel-gold/20 flex items-center justify-center">
              <Icon name="UserIcon" size={16} className="text-nobel-gold" />
            </div>
            <Icon name="ChevronDownIcon" size={16} className="text-text-secondary" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;