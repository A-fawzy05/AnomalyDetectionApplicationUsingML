'use client';

import { useState } from 'react';
import Icon from '../../../components/UI/AppIcon';

interface VariantRow {
  id: string;
  variantPath: string;
  frequency: number;
  anomalyRate: number;
  conformanceScore: number;
  caseCount: number;
  avgDuration: string;
  activities: string[];
}

interface VariantComparisonTableProps {
  variants: VariantRow[];
  onVariantSelect?: (variantId: string) => void;
}

type SortField = 'frequency' | 'anomalyRate' | 'conformanceScore' | 'caseCount';
type SortDirection = 'asc' | 'desc';

const VariantComparisonTable = ({ variants, onVariantSelect }: VariantComparisonTableProps) => {
  const [sortField, setSortField] = useState<SortField>('frequency');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedVariants = [...variants].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const toggleVariantSelection = (variantId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedVariants(newSelected);
  };

  const getConformanceColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  };

  const getAnomalyRateColor = (rate: number) => {
    if (rate >= 15) return 'text-error';
    if (rate >= 8) return 'text-warning';
    return 'text-success';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <Icon name="ChevronUpDownIcon" size={16} className="text-muted-foreground" />;
    }
    return (
      <Icon
        name={sortDirection === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'}
        size={16}
        className="text-primary"
      />
    );
  };

  return (
    <div className="bg-card border border-border/30 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Process Variant Comparison
            </h2>
            <p className="font-caption text-sm text-muted-foreground mt-1">
              {selectedVariants.size} variant{selectedVariants.size !== 1 ? 's' : ''} selected for comparison
            </p>
          </div>
          {selectedVariants.size > 0 && (
            <button
              onClick={() => setSelectedVariants(new Set())}
              className="px-4 py-2 rounded-md bg-muted hover:bg-muted/80 transition-smooth font-caption text-sm font-medium text-foreground"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-4 text-left">
                <span className="font-caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Select
                </span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="font-caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Variant Path
                </span>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('frequency')}
                  className="flex items-center gap-2 font-caption text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Frequency
                  <SortIcon field="frequency" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('anomalyRate')}
                  className="flex items-center gap-2 font-caption text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Anomaly Rate
                  <SortIcon field="anomalyRate" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('conformanceScore')}
                  className="flex items-center gap-2 font-caption text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Conformance
                  <SortIcon field="conformanceScore" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('caseCount')}
                  className="flex items-center gap-2 font-caption text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Cases
                  <SortIcon field="caseCount" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="font-caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Avg Duration
                </span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="font-caption text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {sortedVariants.map((variant) => (
              <>
                <tr
                  key={variant.id}
                  className={`hover:bg-muted/30 transition-smooth ${
                    selectedVariants.has(variant.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedVariants.has(variant.id)}
                      onChange={() => toggleVariantSelection(variant.id)}
                      className="w-4 h-4 rounded border-border/30 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-caption text-sm text-foreground font-medium">
                        {variant.variantPath}
                      </span>
                      <button
                        onClick={() => setExpandedVariant(expandedVariant === variant.id ? null : variant.id)}
                        className="p-1 rounded hover:bg-muted transition-smooth"
                      >
                        <Icon
                          name={expandedVariant === variant.id ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                          size={16}
                          className="text-muted-foreground"
                        />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-caption text-sm text-foreground font-medium">
                        {variant.frequency}%
                      </span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${variant.frequency}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-caption text-sm font-medium ${getAnomalyRateColor(variant.anomalyRate)}`}>
                      {variant.anomalyRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-caption text-sm font-medium ${getConformanceColor(variant.conformanceScore)}`}>
                      {variant.conformanceScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-caption text-sm text-foreground">
                      {variant.caseCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-caption text-sm text-muted-foreground">
                      {variant.avgDuration}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onVariantSelect && onVariantSelect(variant.id)}
                      className="px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-smooth font-caption text-xs font-medium text-primary"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
                {expandedVariant === variant.id && (
                  <tr className="bg-muted/20">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="space-y-3">
                        <h4 className="font-caption text-sm font-medium text-foreground">
                          Activity Sequence:
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {variant.activities.map((activity, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="px-3 py-1.5 rounded-md bg-card border border-border/30">
                                <span className="font-caption text-xs text-foreground">
                                  {activity}
                                </span>
                              </div>
                              {index < variant.activities.length - 1 && (
                                <Icon name="ChevronRightIcon" size={16} className="text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VariantComparisonTable;