'use client';

import { useState } from 'react';
import Icon from '../UI/AppIcon';

interface GlobalHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

const GlobalHeader = ({ onRefresh, isLoading = false }: GlobalHeaderProps) => {
  const [dateRange, setDateRange] = useState('last-7-days');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');

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
      case 'connected':
        return 'bg-success';
      case 'disconnected':
        return 'bg-error';
      case 'connecting':
        return 'bg-warning';
      default:
        return 'bg-muted';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live Data';
      case 'disconnected':
        return 'Disconnected';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Unknown';
    }
  };

  return (
    <header className="sticky top-0 z-dropdown bg-card border-b border-border/30 shadow-sm">
      <div className="flex items-center justify-between h-20 px-lg">
        {/* Left Section - Date Range Selector */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted hover:bg-muted/80 transition-smooth border border-border/30"
              aria-label="Select date range"
              aria-expanded={isDateDropdownOpen}
            >
              <Icon name="CalendarIcon" size={20} className="text-muted-foreground" />
              <span className="font-caption font-medium text-sm text-foreground">
                {dateRangeOptions.find(opt => opt.value === dateRange)?.label}
              </span>
              <Icon
                name="ChevronDownIcon"
                size={16}
                className={`text-muted-foreground transition-transform duration-fast ${
                  isDateDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDateDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-dropdown"
                  onClick={() => setIsDateDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border/30 rounded-md shadow-lg z-dropdown animate-slide-down">
                  <div className="py-2">
                    {dateRangeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleDateRangeChange(option.value)}
                        className={`
                          w-full px-4 py-2 text-left font-caption text-sm
                          transition-smooth hover:bg-muted
                          ${dateRange === option.value
                            ? 'text-primary font-medium bg-muted/50' :'text-popover-foreground'
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border/30">
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()} ${
              connectionStatus === 'connected' ? 'animate-pulse-subtle' : ''
            }`} />
            <span className="font-caption text-xs text-muted-foreground">
              {getConnectionStatusText()}
            </span>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`
              p-2 rounded-md transition-smooth
              ${isLoading
                ? 'bg-muted/50 cursor-not-allowed' :'bg-muted hover:bg-muted/80 hover:scale-105'
              }
            `}
            aria-label="Refresh data"
          >
            <Icon
              name="ArrowPathIcon"
              size={20}
              className={`text-muted-foreground ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-md bg-muted hover:bg-muted/80 transition-smooth hover:scale-105"
            aria-label="View notifications"
          >
            <Icon name="BellIcon" size={20} className="text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
          </button>

          {/* Settings */}
          <button
            className="p-2 rounded-md bg-muted hover:bg-muted/80 transition-smooth hover:scale-105"
            aria-label="Open settings"
          >
            <Icon name="Cog6ToothIcon" size={20} className="text-muted-foreground" />
          </button>

          {/* User Menu */}
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted hover:bg-muted/80 transition-smooth"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <Icon name="UserIcon" size={18} className="text-accent-foreground" />
            </div>
            <Icon name="ChevronDownIcon" size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;