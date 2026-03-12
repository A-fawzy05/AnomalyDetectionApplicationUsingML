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
  return (
    <div className="bg-card border border-border/30 rounded-md p-6">
      <div className="mb-6">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
          Cycle Time Trends & Throughput
        </h3>
        <p className="font-caption text-sm text-muted-foreground">
          Average processing time with case volume overlay
        </p>
      </div>

      <div className="w-full h-80" aria-label="Cycle time trends and throughput chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="period" 
              stroke="#94a3b8"
              style={{ fontSize: '12px', fontFamily: 'Inter' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#94a3b8"
              style={{ fontSize: '12px', fontFamily: 'Inter' }}
              label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#94a3b8"
              style={{ fontSize: '12px', fontFamily: 'Inter' }}
              label={{ value: 'Cases', angle: 90, position: 'insideRight', fill: '#94a3b8' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #475569',
                borderRadius: '6px',
                fontFamily: 'Inter',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#f8fafc' }}
            />
            <Legend 
              wrapperStyle={{ fontFamily: 'Inter', fontSize: '12px' }}
            />
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