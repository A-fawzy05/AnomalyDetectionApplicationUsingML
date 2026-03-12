import Icon from '../../../components/UI/AppIcon';

interface AnomalyFeedItem {
  id: string;
  caseId: string;
  supplier: string;
  anomalyType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  amount: string;
}

interface RealTimeAnomalyFeedProps {
  items: AnomalyFeedItem[];
  onItemClick: (caseId: string) => void;
}

const RealTimeAnomalyFeed = ({ items, onItemClick }: RealTimeAnomalyFeedProps) => {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-error/10',
          border: 'border-error',
          text: 'text-error',
          icon: 'ExclamationCircleIcon' as const
        };
      case 'high':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning',
          text: 'text-warning',
          icon: 'ExclamationTriangleIcon' as const
        };
      case 'medium':
        return {
          bg: 'bg-accent/10',
          border: 'border-accent',
          text: 'text-accent',
          icon: 'InformationCircleIcon' as const
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-muted',
          text: 'text-muted-foreground',
          icon: 'BellIcon' as const
        };
    }
  };

  return (
    <div className="bg-card border border-border/30 rounded-md">
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Real-Time Anomaly Feed
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-subtle" />
          <span className="font-caption text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Icon name="CheckCircleIcon" size={48} className="text-success mb-3" />
            <p className="font-caption text-sm text-muted-foreground text-center">
              No new anomalies detected
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {items.map((item) => {
              const config = getSeverityConfig(item.severity);
              return (
                <div
                  key={item.id}
                  onClick={() => onItemClick(item.caseId)}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-smooth border-l-4 ${config.border}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-md ${config.bg} flex items-center justify-center`}>
                      <Icon name={config.icon} size={18} className={config.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {item.caseId}
                        </span>
                        <span className="font-caption text-xs text-muted-foreground whitespace-nowrap">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="font-caption text-sm text-foreground mb-1">
                        {item.supplier}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-caption text-xs text-muted-foreground">
                          {item.anomalyType}
                        </span>
                        <span className="font-mono text-xs font-medium text-foreground">
                          {item.amount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeAnomalyFeed;