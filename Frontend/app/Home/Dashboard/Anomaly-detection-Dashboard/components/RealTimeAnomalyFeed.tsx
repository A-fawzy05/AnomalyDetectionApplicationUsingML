import Icon from '@/components/UI/AppIcon';

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
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-500',
          text: 'text-red-600 dark:text-red-400',
          icon: 'ExclamationCircleIcon' as const
        };
      case 'high':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-500',
          text: 'text-amber-600 dark:text-amber-400',
          icon: 'ExclamationTriangleIcon' as const
        };
      case 'medium':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-500',
          text: 'text-blue-600 dark:text-blue-400',
          icon: 'InformationCircleIcon' as const
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-400',
          text: 'text-text-secondary',
          icon: 'BellIcon' as const
        };
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border-primary">
        <h3 className="font-serif text-base font-semibold text-text-primary">
          Real-Time Anomaly Feed
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-sans text-xs text-text-secondary">Live</span>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Icon name="CheckCircleIcon" size={48} className="text-emerald-500 mb-3" />
            <p className="font-sans text-sm text-text-secondary text-center">
              No new anomalies detected
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-primary">
            {items.map((item, index) => {
              const config = getSeverityConfig(item.severity);
              return (
                <div
                  key={item.id}
                  onClick={() => onItemClick(item.caseId)}
                  className={`p-4 cursor-pointer hover:bg-bg-primary/50 transition-all duration-300 border-l-4 ${config.border} opacity-0 animate-fade-in-up`}
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <Icon name={config.icon} size={18} className={config.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-text-primary">
                          {item.caseId}
                        </span>
                        <span className="font-sans text-xs text-text-secondary whitespace-nowrap">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="font-sans text-sm text-text-primary mb-1">
                        {item.supplier}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-sans text-xs text-text-secondary">
                          {item.anomalyType}
                        </span>
                        <span className="font-mono text-xs font-medium text-text-primary">
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