'use client';

import { useState } from 'react';
import Icon from '@/components/UI/AppIcon';

interface ProcessActivity {
  id: string;
  name: string;
  avgDuration: number;
  isBottleneck: boolean;
  severity: 'high' | 'medium' | 'low';
  caseCount: number;
}

interface ProcessFlowDiagramProps {
  activities: ProcessActivity[];
  onActivityClick: (activityId: string) => void;
}

const ProcessFlowDiagram = ({ activities, onActivityClick }: ProcessFlowDiagramProps) => {
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-500';
      case 'medium':
        return 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-500';
      case 'low':
        return 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-500';
      default:
        return 'bg-bg-primary border-border-primary';
    }
  };

  const getBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
      <div className="mb-6">
        <h3 className="font-serif text-lg font-semibold text-text-primary mb-1">
          Process Flow with Bottleneck Heatmap
        </h3>
        <p className="font-sans text-sm text-text-secondary">
          Click on any activity to view detailed metrics
        </p>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const isHovered = hoveredActivity === activity.id;
          
          return (
            <div
              key={activity.id}
              className="relative opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
            >
              <button
                onClick={() => onActivityClick(activity.id)}
                onMouseEnter={() => setHoveredActivity(activity.id)}
                onMouseLeave={() => setHoveredActivity(null)}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all duration-300
                  ${getSeverityStyles(activity.severity)}
                  ${isHovered ? 'scale-[1.02] shadow-lg -translate-y-0.5' : ''}
                  ${activity.isBottleneck ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-bg-primary' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${getBadgeColor(activity.severity)} flex items-center justify-center`}>
                      <span className="font-serif font-semibold text-sm text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-sans font-semibold text-sm text-text-primary">
                        {activity.name}
                      </h4>
                      <p className="font-sans text-xs text-text-secondary">
                        {activity.caseCount} cases processed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {activity.isBottleneck && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <Icon name="ExclamationTriangleIcon" size={14} className="text-red-600 dark:text-red-400" />
                        <span className="font-sans text-xs font-medium text-red-600 dark:text-red-400">
                          Bottleneck
                        </span>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="font-serif text-lg font-semibold text-text-primary">
                        {activity.avgDuration.toFixed(3)}d
                      </p>
                      <p className="font-sans text-xs text-text-secondary">
                        Avg Duration
                      </p>
                    </div>
                  </div>
                </div>
              </button>

              {index < activities.length - 1 && (
                <div className="flex justify-center my-2">
                  <Icon name="ChevronDownIcon" size={24} className="text-text-secondary" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border-primary">
        <div className="flex items-center justify-between">
          <span className="font-sans text-sm text-text-secondary">Duration Severity:</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500" />
              <span className="font-sans text-xs text-text-secondary">Low (&lt;5d)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500" />
              <span className="font-sans text-xs text-text-secondary">Medium (5-10d)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="font-sans text-xs text-text-secondary">High (&gt;10d)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessFlowDiagram;