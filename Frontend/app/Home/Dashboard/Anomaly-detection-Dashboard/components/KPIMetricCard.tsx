'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/UI/AppIcon';
import useCountUp from '@/hooks/useCountUp';

interface KPIMetricCardProps {
  title: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: string;
  sparklineData: number[];
  status: 'success' | 'warning' | 'error' | 'neutral';
  delay?: number;
  isLive?: boolean;
}

const KPIMetricCard = ({
  title,
  value,
  trend,
  trendLabel,
  icon,
  sparklineData,
  status,
  delay = 0,
  isLive = false
}: KPIMetricCardProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const numericValue = typeof value === 'number'
    ? value
    : parseFloat(String(value).replace(/[^0-9.]/g, ''));
  const isPercentage = String(value).includes('%');
  const prefix = String(value).match(/^[^0-9]*/)?.[0] || '';
  const suffix = isPercentage ? '%' : '';

  const { count } = useCountUp(numericValue, 1200, isVisible);

  const displayValue = () => {
    if (typeof value === 'string' && isNaN(numericValue)) return value;
    if (isPercentage) return `${count.toLocaleString()}${suffix}`;
    return `${prefix}${count.toLocaleString()}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-text-secondary';
    }
  };

  const getTrendIcon = () => {
    if (trend > 0) return 'ArrowTrendingUpIcon';
    if (trend < 0) return 'ArrowTrendingDownIcon';
    return 'MinusIcon';
  };

  const getTrendColor = () => {
    if (status === 'error') {
      return trend > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
    }
    return trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  };

  const maxValue = Math.max(...sparklineData);
  const minValue = Math.min(...sparklineData);
  const range = maxValue - minValue || 1;

  return (
    <div
      className={`
        bg-bg-secondary border border-border-primary rounded-xl p-6
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-sans text-sm text-text-secondary">{title}</p>
            {isLive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
          <h3 className="font-serif text-2xl font-semibold text-text-primary">{displayValue()}</h3>
        </div>
        <div className={`w-10 h-10 rounded-lg bg-nobel-gold/10 flex items-center justify-center ${getStatusColor()}`}>
          <Icon name={icon as any} size={24} variant="outline" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={getTrendIcon() as any} size={16} className={getTrendColor()} />
          <span className={`font-sans text-sm font-medium ${getTrendColor()}`}>
            {Math.abs(trend)}%
          </span>
          <span className="font-sans text-xs text-text-secondary">{trendLabel}</span>
        </div>

        <div className="flex items-end gap-0.5 h-8">
          {sparklineData.map((val, index) => {
            const height = ((val - minValue) / range) * 100;
            return (
              <div
                key={index}
                className="w-1 rounded-sm bg-nobel-gold/40 transition-all duration-500"
                style={{
                  height: isVisible ? `${Math.max(height, 10)}%` : '0%',
                  transitionDelay: `${delay + index * 80}ms`
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KPIMetricCard;