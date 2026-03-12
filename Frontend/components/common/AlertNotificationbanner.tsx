'use client';

import { useState, useEffect } from 'react';
import Icon from '../UI/AppIcon';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  actionLabel?: string;
  onAction?: () => void;
}

interface AlertNotificationBannerProps {
  alerts?: Alert[];
  onDismiss?: (alertId: string) => void;
  maxVisible?: number;
}

const AlertNotificationBanner = ({
  alerts = [],
  onDismiss,
  maxVisible = 3
}: AlertNotificationBannerProps) => {
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const activeAlerts = alerts
      .filter(alert => !dismissedAlerts.has(alert.id))
      .slice(0, maxVisible);
    setVisibleAlerts(activeAlerts);
  }, [alerts, dismissedAlerts, maxVisible]);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
    if (onDismiss) {
      onDismiss(alertId);
    }
  };

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-error',
          text: 'text-error-foreground',
          icon: 'ExclamationCircleIcon' as const,
          border: 'border-error'
        };
      case 'warning':
        return {
          bg: 'bg-warning',
          text: 'text-warning-foreground',
          icon: 'ExclamationTriangleIcon' as const,
          border: 'border-warning'
        };
      case 'info':
        return {
          bg: 'bg-accent',
          text: 'text-accent-foreground',
          icon: 'InformationCircleIcon' as const,
          border: 'border-accent'
        };
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-alert">
      <div className="space-y-2 p-4">
        {visibleAlerts.map((alert, index) => {
          const styles = getAlertStyles(alert.type);
          
          return (
            <div
              key={alert.id}
              className={`
                ${styles.bg} ${styles.text} rounded-md shadow-lg
                border-l-4 ${styles.border}
                animate-slide-down
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <Icon
                    name={styles.icon}
                    size={24}
                    variant="solid"
                    className={styles.text}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-base mb-1">
                        {alert.title}
                      </h3>
                      <p className="font-caption text-sm opacity-90">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="font-caption text-xs opacity-75">
                          {formatTimestamp(alert.timestamp)}
                        </span>
                        {alert.actionLabel && alert.onAction && (
                          <button
                            onClick={alert.onAction}
                            className="font-caption text-xs font-medium underline hover:no-underline transition-smooth"
                          >
                            {alert.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-smooth"
                      aria-label="Dismiss alert"
                    >
                      <Icon
                        name="XMarkIcon"
                        size={20}
                        className={styles.text}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertNotificationBanner;