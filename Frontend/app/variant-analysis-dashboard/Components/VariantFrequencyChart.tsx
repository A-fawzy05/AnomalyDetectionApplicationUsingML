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
        <div className="bg-popover border border-border/30 rounded-md p-4 shadow-lg">
          <p className="font-heading font-semibold text-sm text-foreground mb-2">
            {data.name}
          </p>
          <div className="space-y-1 font-caption text-xs">
            <p className="text-muted-foreground">
              Frequency: <span className="text-foreground font-medium">{data.frequency}%</span>
            </p>
            <p className="text-muted-foreground">
              Anomaly Rate: <span className="text-foreground font-medium">{data.anomalyRate}%</span>
            </p>
            <p className="text-muted-foreground">
              Cases: <span className="text-foreground font-medium">{data.caseCount.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Variant Frequency vs Anomaly Rate
          </h2>
          <p className="font-caption text-sm text-muted-foreground mt-1">
            Bubble size represents case volume
          </p>
        </div>
        <div className="flex items-center gap-4 font-caption text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-muted-foreground">&lt; 8%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-muted-foreground">8-15%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error" />
            <span className="text-muted-foreground">&gt; 15%</span>
          </div>
        </div>
      </div>

      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              dataKey="frequency"
              name="Frequency"
              unit="%"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              label={{ value: 'Frequency (%)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
            />
            <YAxis
              type="number"
              dataKey="anomalyRate"
              name="Anomaly Rate"
              unit="%"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              label={{ value: 'Anomaly Rate (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
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