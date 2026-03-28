'use client';

import { useState } from 'react';
import Icon from '@/components/UI/AppIcon';

interface VariantFiltersProps {
  onFrequencyFilterChange: (min: number, max: number) => void;
  onConformanceThresholdChange: (threshold: number) => void;
  onDateRangeChange: (range: string) => void;
}

const VariantFilters = ({
  onFrequencyFilterChange,
  onConformanceThresholdChange,
  onDateRangeChange
}: VariantFiltersProps) => {
  const [frequencyMin, setFrequencyMin] = useState(0);
  const [frequencyMax, setFrequencyMax] = useState(100);
  const [conformanceThreshold, setConformanceThreshold] = useState(70);
  const [dateRange, setDateRange] = useState('last-30-days');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-quarter', label: 'This Quarter' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleFrequencyChange = (type: 'min' | 'max', value: number) => {
    if (type === 'min') {
      setFrequencyMin(value);
      onFrequencyFilterChange(value, frequencyMax);
    } else {
      setFrequencyMax(value);
      onFrequencyFilterChange(frequencyMin, value);
    }
  };

  const handleConformanceChange = (value: number) => {
    setConformanceThreshold(value);
    onConformanceThresholdChange(value);
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    setIsDateDropdownOpen(false);
    onDateRangeChange(value);
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-base font-semibold text-text-primary">
          Filter Options
        </h3>
        <button
          onClick={() => {
            setFrequencyMin(0);
            setFrequencyMax(100);
            setConformanceThreshold(70);
            setDateRange('last-30-days');
            onFrequencyFilterChange(0, 100);
            onConformanceThresholdChange(70);
            onDateRangeChange('last-30-days');
          }}
          className="px-3 py-1.5 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors font-sans text-xs font-medium text-text-primary border border-border-primary"
        >
          Reset Filters
        </button>
      </div>

      <div className="space-y-6">
        {/* Date Range Filter */}
        <div>
          <label className="block font-sans text-sm font-medium text-text-primary mb-2">
            Time Period
          </label>
          <div className="relative">
            <button
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors border border-border-primary"
            >
              <div className="flex items-center gap-2">
                <Icon name="CalendarIcon" size={18} className="text-text-secondary" />
                <span className="font-sans text-sm text-text-primary">
                  {dateRangeOptions.find(opt => opt.value === dateRange)?.label}
                </span>
              </div>
              <Icon
                name="ChevronDownIcon"
                size={16}
                className={`text-text-secondary transition-transform duration-200 ${
                  isDateDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDateDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDateDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-border-primary rounded-xl shadow-lg z-50">
                  <div className="py-2">
                    {dateRangeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleDateRangeChange(option.value)}
                        className={`
                          w-full px-4 py-2 text-left font-sans text-sm
                          transition-colors hover:bg-bg-primary
                          ${dateRange === option.value
                            ? 'text-nobel-gold font-medium bg-bg-primary/50' : 'text-text-primary'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Frequency Range Filter */}
        <div>
          <label className="block font-sans text-sm font-medium text-text-primary mb-2">
            Frequency Range: {frequencyMin}% - {frequencyMax}%
          </label>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-xs text-text-secondary">Minimum</span>
                <span className="font-sans text-xs font-medium text-text-primary">{frequencyMin}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={frequencyMin}
                onChange={(e) => handleFrequencyChange('min', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-nobel-gold"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-xs text-text-secondary">Maximum</span>
                <span className="font-sans text-xs font-medium text-text-primary">{frequencyMax}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={frequencyMax}
                onChange={(e) => handleFrequencyChange('max', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-nobel-gold"
              />
            </div>
          </div>
        </div>

        {/* Conformance Threshold Filter */}
        <div>
          <label className="block font-sans text-sm font-medium text-text-primary mb-2">
            Conformance Threshold: {conformanceThreshold}%
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              value={conformanceThreshold}
              onChange={(e) => handleConformanceChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-nobel-gold"
            />
            <div className="flex items-center justify-between font-sans text-xs text-text-secondary">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          <p className="mt-2 font-sans text-xs text-text-secondary">
            Show variants with conformance score above {conformanceThreshold}%
          </p>
        </div>

        {/* Quick Filter Buttons */}
        <div>
          <label className="block font-sans text-sm font-medium text-text-primary mb-2">
            Quick Filters
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { handleFrequencyChange('min', 10); handleFrequencyChange('max', 100); }}
              className="px-3 py-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors font-sans text-xs font-medium text-text-primary border border-border-primary"
            >
              High Frequency
            </button>
            <button
              onClick={() => { handleConformanceChange(90); }}
              className="px-3 py-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors font-sans text-xs font-medium text-text-primary border border-border-primary"
            >
              High Conformance
            </button>
            <button
              onClick={() => { handleFrequencyChange('min', 0); handleFrequencyChange('max', 5); }}
              className="px-3 py-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors font-sans text-xs font-medium text-text-primary border border-border-primary"
            >
              Rare Variants
            </button>
            <button
              onClick={() => { handleConformanceChange(50); }}
              className="px-3 py-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors font-sans text-xs font-medium text-text-primary border border-border-primary"
            >
              Low Conformance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantFilters;