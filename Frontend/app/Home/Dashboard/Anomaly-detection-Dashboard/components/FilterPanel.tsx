'use client';

import { useState } from 'react';
import Icon from '@/components/UI/AppIcon';

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
    <div className="bg-bg-secondary border border-border-primary rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border-primary">
        <div className="flex items-center gap-2">
          <Icon name="FunnelIcon" size={20} className="text-text-secondary" />
          <h3 className="font-serif text-base font-semibold text-text-primary">Filters</h3>
          {totalFiltersApplied > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-nobel-gold text-white font-sans text-xs font-medium">
              {totalFiltersApplied}
            </span>
          )}
        </div>
        {totalFiltersApplied > 0 && (
          <button
            onClick={onClearAll}
            className="font-sans text-xs text-nobel-gold hover:text-nobel-gold/80 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="divide-y divide-border-primary">
        {/* Anomaly Types */}
        <div>
          <button
            onClick={() => toggleSection('anomalyTypes')}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-primary/50 transition-colors"
          >
            <span className="font-sans text-sm font-medium text-text-primary">
              Anomaly Types
            </span>
            <Icon
              name={expandedSections.has('anomalyTypes') ? 'ChevronUpIcon' : 'ChevronDownIcon'}
              size={16}
              className="text-text-secondary"
            />
          </button>
          {expandedSections.has('anomalyTypes') && (
            <div className="px-4 pb-4 space-y-2">
              {anomalyTypes.map(type => (
                <label
                  key={type.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-bg-primary/50 p-2 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedAnomalyTypes.includes(type.id)}
                    onChange={() =>
                      handleCheckboxChange(type.id, selectedAnomalyTypes, onAnomalyTypeChange)
                    }
                    className="w-4 h-4 rounded border-border-primary text-nobel-gold focus:ring-2 focus:ring-nobel-gold"
                  />
                  <span className="flex-1 font-sans text-sm text-text-primary">{type.label}</span>
                  <span className="font-sans text-xs text-text-secondary">{type.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Severity Levels */}
        <div>
          <button
            onClick={() => toggleSection('severityLevels')}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-primary/50 transition-colors"
          >
            <span className="font-sans text-sm font-medium text-text-primary">
              Severity Levels
            </span>
            <Icon
              name={expandedSections.has('severityLevels') ? 'ChevronUpIcon' : 'ChevronDownIcon'}
              size={16}
              className="text-text-secondary"
            />
          </button>
          {expandedSections.has('severityLevels') && (
            <div className="px-4 pb-4 space-y-2">
              {severityLevels.map(level => (
                <label
                  key={level.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-bg-primary/50 p-2 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSeverityLevels.includes(level.id)}
                    onChange={() =>
                      handleCheckboxChange(level.id, selectedSeverityLevels, onSeverityLevelChange)
                    }
                    className="w-4 h-4 rounded border-border-primary text-nobel-gold focus:ring-2 focus:ring-nobel-gold"
                  />
                  <span className="flex-1 font-sans text-sm text-text-primary">{level.label}</span>
                  <span className="font-sans text-xs text-text-secondary">{level.count}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Suppliers */}
        <div>
          <button
            onClick={() => toggleSection('suppliers')}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-primary/50 transition-colors"
          >
            <span className="font-sans text-sm font-medium text-text-primary">Suppliers</span>
            <Icon
              name={expandedSections.has('suppliers') ? 'ChevronUpIcon' : 'ChevronDownIcon'}
              size={16}
              className="text-text-secondary"
            />
          </button>
          {expandedSections.has('suppliers') && (
            <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
              {suppliers.map(supplier => (
                <label
                  key={supplier.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-bg-primary/50 p-2 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.includes(supplier.id)}
                    onChange={() =>
                      handleCheckboxChange(supplier.id, selectedSuppliers, onSupplierChange)
                    }
                    className="w-4 h-4 rounded border-border-primary text-nobel-gold focus:ring-2 focus:ring-nobel-gold"
                  />
                  <span className="flex-1 font-sans text-sm text-text-primary truncate">
                    {supplier.label}
                  </span>
                  <span className="font-sans text-xs text-text-secondary">{supplier.count}</span>
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