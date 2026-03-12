import Icon from '../../../components/UI/AppIcon';

interface KPIMetricCardProps {
  title: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: string;
  sparklineData: number[];
  status: 'success' | 'warning' | 'error' | 'neutral';
}

const KPIMetricCard = ({
  title,
  value,
  trend,
  trendLabel,
  icon,
  sparklineData,
  status
}: KPIMetricCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    if (trend > 0) return 'ArrowTrendingUpIcon';
    if (trend < 0) return 'ArrowTrendingDownIcon';
    return 'MinusIcon';
  };

  const getTrendColor = () => {
    if (status === 'error') {
      return trend > 0 ? 'text-error' : 'text-success';
    }
    return trend > 0 ? 'text-success' : 'text-error';
  };

  const maxValue = Math.max(...sparklineData);
  const minValue = Math.min(...sparklineData);
  const range = maxValue - minValue || 1;

  return (
    <div className="bg-card border border-border/30 rounded-md p-6 hover:shadow-md transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="font-caption text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="font-heading text-2xl font-semibold text-foreground">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-md bg-muted flex items-center justify-center ${getStatusColor()}`}>
          <Icon name={icon as any} size={24} variant="outline" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            name={getTrendIcon() as any}
            size={16}
            className={getTrendColor()}
          />
          <span className={`font-caption text-sm font-medium ${getTrendColor()}`}>
            {Math.abs(trend)}%
          </span>
          <span className="font-caption text-xs text-muted-foreground">{trendLabel}</span>
        </div>

        <div className="flex items-end gap-0.5 h-8">
          {sparklineData.map((value, index) => {
            const height = ((value - minValue) / range) * 100;
            return (
              <div
                key={index}
                className={`w-1 rounded-sm ${getStatusColor()} opacity-60`}
                style={{ height: `${Math.max(height, 10)}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KPIMetricCard;