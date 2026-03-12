import Icon from '../../../components/UI/AppIcon';

interface PerformanceKPICardProps {
  title: string;
  value: string;
  unit: string;
  change: number;
  changeLabel: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
}

const PerformanceKPICard = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  trend
}: PerformanceKPICardProps) => {
  const getTrendColor = () => {
    if (trend === 'neutral') return 'text-muted-foreground';
    return trend === 'up' ? 'text-success' : 'text-error';
  };

  const getTrendIcon = () => {
    if (trend === 'neutral') return 'MinusIcon';
    return trend === 'up' ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon';
  };

  return (
    <div className="bg-card border border-border/30 rounded-md p-6 hover:shadow-md transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="font-caption text-sm text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-heading text-3xl font-semibold text-foreground">{value}</h3>
            <span className="font-caption text-sm text-muted-foreground">{unit}</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon name={icon as any} size={24} className="text-primary" />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Icon 
          name={getTrendIcon() as any} 
          size={16} 
          className={getTrendColor()}
        />
        <span className={`font-caption text-sm font-medium ${getTrendColor()}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
        <span className="font-caption text-xs text-muted-foreground">{changeLabel}</span>
      </div>
    </div>
  );
};

export default PerformanceKPICard;