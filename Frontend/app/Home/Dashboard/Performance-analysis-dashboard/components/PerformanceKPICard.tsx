'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/UI/AppIcon';
import useCountUp from '@/hooks/useCountUp';

interface PerformanceKPICardProps {
  title: string;
  value: string;
  unit: string;
  change: number;
  changeLabel: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
  delay?: number;
}

const PerformanceKPICard = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  trend,
  delay = 0
}: PerformanceKPICardProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  const { count } = useCountUp(numericValue * 10, 1200, isVisible);
  const displayValue = isNaN(numericValue)
    ? value
    : (count / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });

  const getTrendColor = () => {
    if (trend === 'neutral') return 'text-text-secondary';
    return trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  };

  const getTrendIcon = () => {
    if (trend === 'neutral') return 'MinusIcon';
    return trend === 'up' ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon';
  };

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
          <p className="font-sans text-sm text-text-secondary mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-3xl font-semibold text-text-primary">{displayValue}</h3>
            <span className="font-sans text-sm text-text-secondary">{unit}</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-lg bg-nobel-gold/10 flex items-center justify-center">
          <Icon name={icon as any} size={24} className="text-nobel-gold" />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Icon 
          name={getTrendIcon() as any} 
          size={16} 
          className={getTrendColor()}
        />
        <span className={`font-sans text-sm font-medium ${getTrendColor()}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
        <span className="font-sans text-xs text-text-secondary">{changeLabel}</span>
      </div>
    </div>
  );
};

export default PerformanceKPICard;