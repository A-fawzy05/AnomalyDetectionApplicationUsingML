'use client';

import { useState } from 'react';
import Icon from '@/components/UI/AppIcon';

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
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAnomalyRateColor = (rate: number) => {
    if (rate >= 15) return 'text-red-600 dark:text-red-400';
    if (rate >= 8) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <Icon name="ChevronUpDownIcon" size={16} className="text-text-secondary" />;
    }
    return (
      <Icon
        name={sortDirection === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'}
        size={16}
        className="text-nobel-gold"
      />
    );
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border-primary">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-text-primary">
              Process Variant Comparison
            </h2>
            <p className="font-sans text-sm text-text-secondary mt-1">
              {selectedVariants.size} variant{selectedVariants.size !== 1 ? 's' : ''} selected for comparison
            </p>
          </div>
          {selectedVariants.size > 0 && (
            <button
              onClick={() => setSelectedVariants(new Set())}
              className="px-4 py-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors font-sans text-sm font-medium text-text-primary border border-border-primary"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-primary/50">
            <tr>
              <th className="px-6 py-4 text-left">
                <span className="font-sans text-xs font-medium text-text-secondary uppercase tracking-wider">Select</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="font-sans text-xs font-medium text-text-secondary uppercase tracking-wider">Variant Path</span>
              </th>
              <th className="px-6 py-4 text-left">
                <button onClick={() => handleSort('frequency')} className="flex items-center gap-2 font-sans text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors">
                  Frequency <SortIcon field="frequency" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button onClick={() => handleSort('anomalyRate')} className="flex items-center gap-2 font-sans text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors">
                  Anomaly Rate <SortIcon field="anomalyRate" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button onClick={() => handleSort('conformanceScore')} className="flex items-center gap-2 font-sans text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors">
                  Conformance <SortIcon field="conformanceScore" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button onClick={() => handleSort('caseCount')} className="flex items-center gap-2 font-sans text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors">
                  Cases <SortIcon field="caseCount" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="font-sans text-xs font-medium text-text-secondary uppercase tracking-wider">Avg Duration</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="font-sans text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary">
            {sortedVariants.map((variant) => (
              <>
                <tr
                  key={variant.id}
                  className={`hover:bg-bg-primary/30 transition-colors duration-200 ${
                    selectedVariants.has(variant.id) ? 'bg-nobel-gold/5' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedVariants.has(variant.id)}
                      onChange={() => toggleVariantSelection(variant.id)}
                      className="w-4 h-4 rounded border-border-primary text-nobel-gold focus:ring-2 focus:ring-nobel-gold cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm text-text-primary font-medium">{variant.variantPath}</span>
                      <button
                        onClick={() => setExpandedVariant(expandedVariant === variant.id ? null : variant.id)}
                        className="p-1 rounded-lg hover:bg-bg-primary transition-colors"
                      >
                        <Icon
                          name={expandedVariant === variant.id ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                          size={16}
                          className="text-text-secondary"
                        />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm text-text-primary font-medium">{variant.frequency}%</span>
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-nobel-gold rounded-full" style={{ width: `${variant.frequency}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-sans text-sm font-medium ${getAnomalyRateColor(variant.anomalyRate)}`}>
                      {variant.anomalyRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-sans text-sm font-medium ${getConformanceColor(variant.conformanceScore)}`}>
                      {variant.conformanceScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-sans text-sm text-text-primary">{variant.caseCount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-sans text-sm text-text-secondary">{variant.avgDuration}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onVariantSelect && onVariantSelect(variant.id)}
                      className="px-3 py-1.5 rounded-lg bg-nobel-gold/10 hover:bg-nobel-gold/20 transition-colors font-sans text-xs font-medium text-nobel-gold"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
                {expandedVariant === variant.id && (
                  <tr className="bg-bg-primary/20">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="space-y-3">
                        <h4 className="font-sans text-sm font-medium text-text-primary">Activity Sequence:</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {variant.activities.map((activity, aIndex) => (
                            <div key={aIndex} className="flex items-center gap-2">
                              <div className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-primary">
                                <span className="font-sans text-xs text-text-primary">{activity}</span>
                              </div>
                              {aIndex < variant.activities.length - 1 && (
                                <Icon name="ChevronRightIcon" size={16} className="text-text-secondary" />
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