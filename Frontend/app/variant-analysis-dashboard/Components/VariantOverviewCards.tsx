import Icon from '../../../components/UI/AppIcon';

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
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'ArrowTrendingUpIcon';
      case 'down':
        return 'ArrowTrendingDownIcon';
      default:
        return 'MinusIcon';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="bg-card border border-border/30 rounded-lg p-6 hover:shadow-md transition-smooth"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon
                name={metric.icon as any}
                size={24}
                className="text-primary"
              />
            </div>
            <div className={`flex items-center gap-1 ${getTrendColor(metric.trend)}`}>
              <Icon
                name={getTrendIcon(metric.trend) as any}
                size={16}
              />
              <span className="font-caption text-xs font-medium">
                {metric.trendValue}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-caption text-sm text-muted-foreground">
              {metric.label}
            </h3>
            <p className="font-heading text-2xl font-semibold text-foreground">
              {metric.value}
            </p>
            <p className="font-caption text-xs text-muted-foreground">
              {metric.subValue}
            </p>
            {metric.benchmark && (
              <div className="pt-2 border-t border-border/30">
                <p className="font-caption text-xs text-muted-foreground">
                  Benchmark: <span className="text-foreground font-medium">{metric.benchmark}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VariantOverviewCards;