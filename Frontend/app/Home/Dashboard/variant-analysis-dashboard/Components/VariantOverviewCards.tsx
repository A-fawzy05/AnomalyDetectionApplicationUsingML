'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/UI/AppIcon';
import useCountUp from '@/hooks/useCountUp';

interface VariantMetric {
  label: string;
  value: string;
  subValue: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: string;
  benchmark?: string;
}

interface VariantOverviewCardsProps {
  metrics: VariantMetric[];
}

const VariantOverviewCards = ({ metrics }: VariantOverviewCardsProps) => {
  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'text-emerald-600 dark:text-emerald-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      default: return 'text-text-secondary';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'ArrowTrendingUpIcon';
      case 'down': return 'ArrowTrendingDownIcon';
      default: return 'MinusIcon';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <VariantCard key={index} metric={metric} index={index} getTrendColor={getTrendColor} getTrendIcon={getTrendIcon} />
      ))}
    </div>
  );
};

function VariantCard({
  metric,
  index,
  getTrendColor,
  getTrendIcon
}: {
  metric: VariantOverviewCardsProps['metrics'][0];
  index: number;
  getTrendColor: (trend: 'up' | 'down' | 'neutral') => string;
  getTrendIcon: (trend: 'up' | 'down' | 'neutral') => string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const delay = index * 100;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const numericValue = parseFloat(metric.value.replace(/[^0-9.]/g, ''));
  const { count } = useCountUp(numericValue, 1200, isVisible);
  const displayValue = isNaN(numericValue)
    ? metric.value
    : metric.value.includes('%')
      ? `${count}%`
      : metric.value.includes('.')
        ? count.toLocaleString()
        : count.toLocaleString();

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
        <div className="w-12 h-12 rounded-lg bg-nobel-gold/10 flex items-center justify-center">
          <Icon name={metric.icon as any} size={24} className="text-nobel-gold" />
        </div>
        <div className={`flex items-center gap-1 ${getTrendColor(metric.trend)}`}>
          <Icon name={getTrendIcon(metric.trend) as any} size={16} />
          <span className="font-sans text-xs font-medium">{metric.trendValue}</span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-sans text-sm text-text-secondary">{metric.label}</h3>
        <p className="font-serif text-2xl font-semibold text-text-primary">{displayValue}</p>
        <p className="font-sans text-xs text-text-secondary">{metric.subValue}</p>
        {metric.benchmark && (
          <div className="pt-2 border-t border-border-primary">
            <p className="font-sans text-xs text-text-secondary">
              Benchmark: <span className="text-text-primary font-medium">{metric.benchmark}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VariantOverviewCards;