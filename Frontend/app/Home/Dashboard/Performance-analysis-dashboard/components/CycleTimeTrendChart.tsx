'use client';

import { Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

interface ChartDataPoint {
  period: string;
  cycleTime: number;
  throughput: number;
  benchmark: number;
}

interface CycleTimeTrendChartProps {
  data: ChartDataPoint[];
  isIndustryBenchmark: boolean;
}

const CycleTimeTrendChart = ({ data, isIndustryBenchmark }: CycleTimeTrendChartProps) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-4 shadow-lg">
          <p className="font-serif font-semibold text-sm text-text-primary mb-2">{label}</p>
          <div className="space-y-1 font-sans text-xs">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: <span className="font-medium text-text-primary">{entry.value}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <div className="mb-6">
        <h3 className="font-serif text-lg font-semibold text-text-primary mb-1">
          Cycle Time Trends & Throughput
        </h3>
        <p className="font-sans text-sm text-text-secondary">
          Average processing time with case volume overlay
        </p>
      </div>

      <div className="w-full h-80" aria-label="Cycle time trends and throughput chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
            <XAxis 
              dataKey="period" 
              stroke="var(--color-text-secondary)"
              style={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="var(--color-text-secondary)"
              style={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
              label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: 'var(--color-text-secondary)' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="var(--color-text-secondary)"
              style={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
              label={{ value: 'Cases', angle: 90, position: 'insideRight', fill: 'var(--color-text-secondary)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--color-text-secondary)' }} />
            <Bar 
              yAxisId="right"
              dataKey="throughput" 
              fill="#475569" 
              name="Throughput (Cases)"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="cycleTime" 
              stroke="#2563eb" 
              strokeWidth={3}
              name="Avg Cycle Time (Days)"
              dot={{ fill: '#2563eb', r: 4 }}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="benchmark" 
              stroke="#10b981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name={`${isIndustryBenchmark ? 'Industry' : 'Internal'} Benchmark`}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CycleTimeTrendChart;