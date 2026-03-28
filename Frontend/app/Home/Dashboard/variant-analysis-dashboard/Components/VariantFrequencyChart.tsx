'use client';

import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface VariantDataPoint {
  id: string;
  name: string;
  frequency: number;
  anomalyRate: number;
  caseCount: number;
}

interface VariantFrequencyChartProps {
  data: VariantDataPoint[];
  onVariantClick?: (variantId: string) => void;
}

const VariantFrequencyChart = ({ data, onVariantClick }: VariantFrequencyChartProps) => {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const handleClick = (entry: any) => {
    setSelectedVariant(entry.id);
    if (onVariantClick) {
      onVariantClick(entry.id);
    }
  };

  const getColor = (anomalyRate: number) => {
    if (anomalyRate >= 15) return '#ef4444';
    if (anomalyRate >= 8) return '#f59e0b';
    return '#10b981';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-4 shadow-lg">
          <p className="font-serif font-semibold text-sm text-text-primary mb-2">
            {data.name}
          </p>
          <div className="space-y-1 font-sans text-xs">
            <p className="text-text-secondary">
              Frequency: <span className="text-text-primary font-medium">{data.frequency}%</span>
            </p>
            <p className="text-text-secondary">
              Anomaly Rate: <span className="text-text-primary font-medium">{data.anomalyRate}%</span>
            </p>
            <p className="text-text-secondary">
              Cases: <span className="text-text-primary font-medium">{data.caseCount.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-lg font-semibold text-text-primary">
            Variant Frequency vs Anomaly Rate
          </h2>
          <p className="font-sans text-sm text-text-secondary mt-1">
            Bubble size represents case volume
          </p>
        </div>
        <div className="flex items-center gap-4 font-sans text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-text-secondary">&lt; 8%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-text-secondary">8-15%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-text-secondary">&gt; 15%</span>
          </div>
        </div>
      </div>

      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
            <XAxis
              type="number"
              dataKey="frequency"
              name="Frequency"
              unit="%"
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              label={{ value: 'Frequency (%)', position: 'insideBottom', offset: -10, fill: 'var(--color-text-secondary)' }}
            />
            <YAxis
              type="number"
              dataKey="anomalyRate"
              name="Anomaly Rate"
              unit="%"
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              label={{ value: 'Anomaly Rate (%)', angle: -90, position: 'insideLeft', fill: 'var(--color-text-secondary)' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={data}
              onClick={handleClick}
              cursor="pointer"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.anomalyRate)}
                  fillOpacity={selectedVariant === entry.id ? 1 : 0.7}
                  r={Math.sqrt(entry.caseCount) / 10}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VariantFrequencyChart;