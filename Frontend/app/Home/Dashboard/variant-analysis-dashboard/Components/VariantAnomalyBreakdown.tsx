'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Icon from '@/components/UI/AppIcon';

interface AnomalySeverity {
  severity: string;
  count: number;
  percentage: number;
  color: string;
}

interface VariantAnomalyBreakdownProps {
  selectedVariant: string | null;
  severityData: AnomalySeverity[];
  totalCases: number;
  anomalousCases: number;
}

const VariantAnomalyBreakdown = ({
  selectedVariant,
  severityData,
  totalCases,
  anomalousCases
}: VariantAnomalyBreakdownProps) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-3 shadow-lg">
          <p className="font-sans text-sm font-medium text-text-primary mb-1">{data.name}</p>
          <p className="font-sans text-xs text-text-secondary">
            Count: <span className="text-text-primary font-medium">{data.value.toLocaleString()}</span>
          </p>
          <p className="font-sans text-xs text-text-secondary">
            Percentage: <span className="text-text-primary font-medium">{data.payload.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-base font-semibold text-text-primary">
            Anomaly Severity Distribution
          </h3>
          {selectedVariant && (
            <span className="px-3 py-1 rounded-lg bg-nobel-gold/10 font-sans text-xs font-medium text-nobel-gold">
              {selectedVariant}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-bg-primary/50 border border-border-primary">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="DocumentTextIcon" size={20} className="text-nobel-gold" />
              <span className="font-sans text-xs text-text-secondary">Total Cases</span>
            </div>
            <p className="font-serif text-2xl font-semibold text-text-primary">
              {totalCases.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-bg-primary/50 border border-border-primary">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="ExclamationTriangleIcon" size={20} className="text-red-500" />
              <span className="font-sans text-xs text-text-secondary">Anomalous</span>
            </div>
            <p className="font-serif text-2xl font-semibold text-text-primary">
              {anomalousCases.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="severity"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="font-sans text-xs text-text-secondary">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
        <h3 className="font-serif text-base font-semibold text-text-primary mb-4">
          Severity Breakdown
        </h3>
        <div className="space-y-3">
          {severityData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl bg-bg-primary/50 border border-border-primary opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-sans text-sm font-medium text-text-primary">{item.severity}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-sans text-sm text-text-secondary">{item.count.toLocaleString()} cases</span>
                <span className="font-sans text-sm font-medium text-text-primary">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
        <h3 className="font-serif text-base font-semibold text-text-primary mb-4">
          Quick Insights
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <Icon name="LightBulbIcon" size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-sans text-sm text-text-primary font-medium mb-1">
                High Anomaly Concentration
              </p>
              <p className="font-sans text-xs text-text-secondary">
                This variant shows {((anomalousCases / totalCases) * 100).toFixed(1)}% anomaly rate, which is above the threshold
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Icon name="ChartBarIcon" size={20} className="text-nobel-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-sans text-sm text-text-primary font-medium mb-1">
                Process Optimization Opportunity
              </p>
              <p className="font-sans text-xs text-text-secondary">
                Consider reviewing this variant for potential process improvements
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantAnomalyBreakdown;