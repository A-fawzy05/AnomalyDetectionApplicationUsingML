'use client';

import { useState } from 'react';
import Icon from '@/components/UI/AppIcon';

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
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-primary transition-colors border border-border-primary"
        aria-label="Filter by process stage"
        aria-expanded={isExpanded}
      >
        <Icon name="FunnelIcon" size={20} className="text-text-secondary" />
        <span className="font-sans font-medium text-sm text-text-primary">
          Process Stages {selectedStages.length > 0 && `(${selectedStages.length})`}
        </span>
        <Icon
          name="ChevronDownIcon"
          size={16}
          className={`text-text-secondary transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-bg-secondary border border-border-primary rounded-xl shadow-lg z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-sans font-semibold text-sm text-text-primary">
                  Filter by Stage
                </span>
                {selectedStages.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="font-sans text-xs text-nobel-gold hover:underline"
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
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-primary cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onStageToggle(stage.id)}
                        className="w-4 h-4 rounded border-border-primary text-nobel-gold focus:ring-2 focus:ring-nobel-gold"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-sans text-sm text-text-primary">
                          {stage.label}
                        </span>
                        <span className="font-sans text-xs text-text-secondary">
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