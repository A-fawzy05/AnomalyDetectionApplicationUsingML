'use client';

import { useState } from 'react';
import Icon from '../../../components/UI/AppIcon';

interface ProcessStage {
  id: string;
  label: string;
  count: number;
}

interface ProcessStageFilterProps {
  stages: ProcessStage[];
  selectedStages: string[];
  onStageToggle: (stageId: string) => void;
  onClearAll: () => void;
}

const ProcessStageFilter = ({
  stages,
  selectedStages,
  onStageToggle,
  onClearAll
}: ProcessStageFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted hover:bg-muted/80 transition-smooth border border-border/30"
        aria-label="Filter by process stage"
        aria-expanded={isExpanded}
      >
        <Icon name="FunnelIcon" size={20} className="text-muted-foreground" />
        <span className="font-caption font-medium text-sm text-foreground">
          Process Stages {selectedStages.length > 0 && `(${selectedStages.length})`}
        </span>
        <Icon
          name="ChevronDownIcon"
          size={16}
          className={`text-muted-foreground transition-transform duration-fast ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-dropdown"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-popover border border-border/30 rounded-md shadow-lg z-dropdown">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-caption font-semibold text-sm text-foreground">
                  Filter by Stage
                </span>
                {selectedStages.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="font-caption text-xs text-primary hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stages.map((stage) => {
                  const isSelected = selectedStages.includes(stage.id);
                  
                  return (
                    <label
                      key={stage.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-smooth"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onStageToggle(stage.id)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-caption text-sm text-foreground">
                          {stage.label}
                        </span>
                        <span className="font-caption text-xs text-muted-foreground">
                          {stage.count} cases
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProcessStageFilter;