'use client';

import Icon from '../../../components/UI/AppIcon';

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
    if (variance > 50) return 'text-error';
    if (variance > 25) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="bg-card border border-border/30 rounded-md p-6">
      <div className="mb-6">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
          Activity Performance Ranking
        </h3>
        <p className="font-caption text-sm text-muted-foreground">
          Sorted by average duration (highest first)
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {rankings.map((activity, index) => (
          <button
            key={activity.id}
            onClick={() => onActivitySelect(activity.id)}
            className="w-full p-4 rounded-md bg-muted/50 hover:bg-muted transition-smooth border border-border/30 text-left"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="font-heading text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-caption font-semibold text-sm text-foreground mb-1">
                  {activity.name}
                </h4>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <p className="font-caption text-xs text-muted-foreground">Avg</p>
                    <p className="font-heading text-sm font-semibold text-foreground">
                      {activity.avgDuration}d
                    </p>
                  </div>
                  <div>
                    <p className="font-caption text-xs text-muted-foreground">Min-Max</p>
                    <p className="font-caption text-sm text-foreground">
                      {activity.minDuration}d - {activity.maxDuration}d
                    </p>
                  </div>
                  <div>
                    <p className="font-caption text-xs text-muted-foreground">Variance</p>
                    <p className={`font-heading text-sm font-semibold ${getVarianceColor(activity.variance)}`}>
                      {activity.variance}%
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-md bg-accent/10">
                  <Icon name="LightBulbIcon" size={14} className="text-accent flex-shrink-0 mt-0.5" />
                  <p className="font-caption text-xs text-accent-foreground">
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