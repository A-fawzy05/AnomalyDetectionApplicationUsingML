'use client';

import { useState } from 'react';
import Icon from '../../../components/UI/AppIcon';

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface FilterPanelProps {
  anomalyTypes: FilterOption[];
  severityLevels: FilterOption[];
  suppliers: FilterOption[];
  selectedAnomalyTypes: string[];
  selectedSeverityLevels: string[];
  selectedSuppliers: string[];
  onAnomalyTypeChange: (types: string[]) => void;
  onSeverityLevelChange: (levels: string[]) => void;
  onSupplierChange: (suppliers: string[]) => void;
  onClearAll: () => void;
}

const FilterPanel = ({
  anomalyTypes,
  severityLevels,
  suppliers,
  selectedAnomalyTypes,
  selectedSeverityLevels,
  selectedSuppliers,
  onAnomalyTypeChange,
  onSeverityLevelChange,
  onSupplierChange,
  onClearAll
}: FilterPanelProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['anomalyTypes', 'severityLevels'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleCheckboxChange = (
    value: string,
    selected: string[],
    onChange: (values: string[]) => void
  ) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const totalFiltersApplied =
    selectedAnomalyTypes.length + selectedSeverityLevels.length + selectedSuppliers.length;

  return (
    <div className="bg-card border border-border/30 rounded-md">
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Icon name="FunnelIcon" size={20} className="text-muted-foreground" />
          <h3 className="font-heading text-base font-semibold text-foreground">Filters</h3>
          {totalFiltersApplied > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-caption text-xs font-medium">
              {totalFiltersApplied}
            </span>
          )}
        </div>
        {totalFiltersApplied > 0 && (
          <button
            onClick={onClearAll}
            className="font-caption text-xs text-accent hover:text-accent/80 transition-smooth"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="divide-y divide-border/30">
        {/* Anomaly Types */}
        <div>
          <button
            onClick={() => toggleSection('anomalyTypes')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-smooth"
          >
            <span className="font-caption text-sm font-medium text-foreground">
              Anomaly Types
            </span>
            <Icon
              name={expandedSections.has('anomalyTypes') ? 'ChevronUpIcon' : 'ChevronDownIcon'}
              size={16}
              className="text-muted-foreground"
            />
          </button>
          {expandedSections.has('anomalyTypes') && (
            <div className="px-4 pb-4 space-y-2">
              {anomalyTypes.map(type => (
                <label
                  key={type.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-smooth"
                >
                  <input
                    type="checkbox"
                    checked={selectedAnomalyTypes.includes(type.id)}
                    onChange={() =>
                      handleCheckboxChange(type.id, selectedAnomalyTypes, onAnomalyTypeChange)
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="flex-1 font-caption text-sm text-foreground">{type.label}</span>
                  <span className="font-caption text-xs text-muted-foreground">{type.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Severity Levels */}
        <div>
          <button
            onClick={() => toggleSection('severityLevels')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-smooth"
          >
            <span className="font-caption text-sm font-medium text-foreground">
              Severity Levels
            </span>
            <Icon
              name={expandedSections.has('severityLevels') ? 'ChevronUpIcon' : 'ChevronDownIcon'}
              size={16}
              className="text-muted-foreground"
            />
          </button>
          {expandedSections.has('severityLevels') && (
            <div className="px-4 pb-4 space-y-2">
              {severityLevels.map(level => (
                <label
                  key={level.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-smooth"
                >
                  <input
                    type="checkbox"
                    checked={selectedSeverityLevels.includes(level.id)}
                    onChange={() =>
                      handleCheckboxChange(level.id, selectedSeverityLevels, onSeverityLevelChange)
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="flex-1 font-caption text-sm text-foreground">{level.label}</span>
                  <span className="font-caption text-xs text-muted-foreground">{level.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Suppliers */}
        <div>
          <button
            onClick={() => toggleSection('suppliers')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-smooth"
          >
            <span className="font-caption text-sm font-medium text-foreground">Suppliers</span>
            <Icon
              name={expandedSections.has('suppliers') ? 'ChevronUpIcon' : 'ChevronDownIcon'}
              size={16}
              className="text-muted-foreground"
            />
          </button>
          {expandedSections.has('suppliers') && (
            <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
              {suppliers.map(supplier => (
                <label
                  key={supplier.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-smooth"
                >
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.includes(supplier.id)}
                    onChange={() =>
                      handleCheckboxChange(supplier.id, selectedSuppliers, onSupplierChange)
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="flex-1 font-caption text-sm text-foreground truncate">
                    {supplier.label}
                  </span>
                  <span className="font-caption text-xs text-muted-foreground">{supplier.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;