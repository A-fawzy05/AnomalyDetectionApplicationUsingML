'use client';

import Icon from '@/components/UI/AppIcon';

interface ActivityRanking {
  id: string;
  name: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  variance: number;
  recommendation: string;
}

interface ActivityPerformanceRankingProps {
  rankings: ActivityRanking[];
  onActivitySelect: (activityId: string) => void;
}

const ActivityPerformanceRanking = ({ rankings, onActivitySelect }: ActivityPerformanceRankingProps) => {
  const getVarianceColor = (variance: number) => {
    if (variance > 50) return 'text-red-600 dark:text-red-400';
    if (variance > 25) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
      <div className="mb-6">
        <h3 className="font-serif text-lg font-semibold text-text-primary mb-1">
          Activity Performance Ranking
        </h3>
        <p className="font-sans text-sm text-text-secondary">
          Sorted by average duration (highest first)
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {rankings.map((activity, index) => (
          <button
            key={activity.id}
            onClick={() => onActivitySelect(activity.id)}
            className={`
              w-full p-4 rounded-xl bg-bg-primary/50 hover:bg-bg-primary transition-all duration-300
              border border-border-primary text-left hover:-translate-y-0.5 hover:shadow-sm
              opacity-0 animate-fade-in-up
            `}
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-nobel-gold flex items-center justify-center flex-shrink-0">
                <span className="font-serif text-xs font-semibold text-white">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-sans font-semibold text-sm text-text-primary mb-1">
                  {activity.name}
                </h4>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <p className="font-sans text-xs text-text-secondary">Avg</p>
                    <p className="font-serif text-sm font-semibold text-text-primary">
                      {activity.avgDuration.toFixed(3)}d
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-xs text-text-secondary">Min-Max</p>
                    <p className="font-sans text-sm text-text-primary">
                      {activity.minDuration.toFixed(3)}d – {activity.maxDuration.toFixed(3)}d
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-xs text-text-secondary">Variance</p>
                    <p className={`font-serif text-sm font-semibold ${getVarianceColor(activity.variance)}`}>
                      {activity.variance.toFixed(3)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <Icon name="LightBulbIcon" size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="font-sans text-xs text-amber-800 dark:text-amber-200">
                    {activity.recommendation}
                  </p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActivityPerformanceRanking;