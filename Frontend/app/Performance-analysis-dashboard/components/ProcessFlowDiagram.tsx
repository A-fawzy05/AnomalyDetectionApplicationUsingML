'use client';

import { useState } from 'react';
import Icon from '../../../components/UI/AppIcon';

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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-error border-error';
      case 'medium':
        return 'bg-warning border-warning';
      case 'low':
        return 'bg-success border-success';
      default:
        return 'bg-muted border-border';
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-error-foreground';
      case 'medium':
        return 'text-warning-foreground';
      case 'low':
        return 'text-success-foreground';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="bg-card border border-border/30 rounded-md p-6">
      <div className="mb-6">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
          Process Flow with Bottleneck Heatmap
        </h3>
        <p className="font-caption text-sm text-muted-foreground">
          Click on any activity to view detailed metrics
        </p>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const isHovered = hoveredActivity === activity.id;
          
          return (
            <div key={activity.id} className="relative">
              <button
                onClick={() => onActivityClick(activity.id)}
                onMouseEnter={() => setHoveredActivity(activity.id)}
                onMouseLeave={() => setHoveredActivity(null)}
                className={`
                  w-full p-4 rounded-md border-2 transition-smooth
                  ${getSeverityColor(activity.severity)}
                  ${isHovered ? 'scale-105 shadow-lg' : ''}
                  ${activity.isBottleneck ? 'ring-2 ring-error ring-offset-2 ring-offset-background' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${getSeverityColor(activity.severity)} flex items-center justify-center`}>
                      <span className={`font-heading font-semibold text-sm ${getSeverityTextColor(activity.severity)}`}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="text-left">
                      <h4 className={`font-caption font-semibold text-sm ${getSeverityTextColor(activity.severity)}`}>
                        {activity.name}
                      </h4>
                      <p className={`font-caption text-xs ${getSeverityTextColor(activity.severity)} opacity-80`}>
                        {activity.caseCount} cases processed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {activity.isBottleneck && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-error/20">
                        <Icon name="ExclamationTriangleIcon" size={14} className="text-error" />
                        <span className="font-caption text-xs font-medium text-error">
                          Bottleneck
                        </span>
                      </div>
                    )}
                    <div className="text-right">
                      <p className={`font-heading text-lg font-semibold ${getSeverityTextColor(activity.severity)}`}>
                        {activity.avgDuration}d
                      </p>
                      <p className={`font-caption text-xs ${getSeverityTextColor(activity.severity)} opacity-80`}>
                        Avg Duration
                      </p>
                    </div>
                  </div>
                </div>
              </button>

              {index < activities.length - 1 && (
                <div className="flex justify-center my-2">
                  <Icon name="ChevronDownIcon" size={24} className="text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border/30">
        <div className="flex items-center justify-between">
          <span className="font-caption text-sm text-muted-foreground">Duration Severity:</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success" />
              <span className="font-caption text-xs text-muted-foreground">Low (&lt;5d)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-warning" />
              <span className="font-caption text-xs text-muted-foreground">Medium (5-10d)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-error" />
              <span className="font-caption text-xs text-muted-foreground">High (&gt;10d)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessFlowDiagram;