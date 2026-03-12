'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Icon from '../../../components/UI/AppIcon';

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
        <div className="bg-popover border border-border/30 rounded-md p-3 shadow-lg">
          <p className="font-caption text-sm font-medium text-foreground mb-1">
            {data.name}
          </p>
          <p className="font-caption text-xs text-muted-foreground">
            Count: <span className="text-foreground font-medium">{data.value.toLocaleString()}</span>
          </p>
          <p className="font-caption text-xs text-muted-foreground">
            Percentage: <span className="text-foreground font-medium">{data.payload.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-base font-semibold text-foreground">
            Anomaly Severity Distribution
          </h3>
          {selectedVariant && (
            <span className="px-3 py-1 rounded-md bg-primary/10 font-caption text-xs font-medium text-primary">
              {selectedVariant}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="DocumentTextIcon" size={20} className="text-primary" />
              <span className="font-caption text-xs text-muted-foreground">Total Cases</span>
            </div>
            <p className="font-heading text-2xl font-semibold text-foreground">
              {totalCases.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="ExclamationTriangleIcon" size={20} className="text-error" />
              <span className="font-caption text-xs text-muted-foreground">Anomalous</span>
            </div>
            <p className="font-heading text-2xl font-semibold text-foreground">
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
                formatter={(value, entry: any) => (
                  <span className="font-caption text-xs text-muted-foreground">
                    {value} ({entry.payload.percentage}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border/30 rounded-lg p-6">
        <h3 className="font-heading text-base font-semibold text-foreground mb-4">
          Severity Breakdown
        </h3>
        <div className="space-y-3">
          {severityData.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-caption text-sm font-medium text-foreground">
                  {item.severity}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-caption text-sm text-muted-foreground">
                  {item.count.toLocaleString()} cases
                </span>
                <span className="font-caption text-sm font-medium text-foreground">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border/30 rounded-lg p-6">
        <h3 className="font-heading text-base font-semibold text-foreground mb-4">
          Quick Insights
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Icon name="LightBulbIcon" size={20} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-caption text-sm text-foreground font-medium mb-1">
                High Anomaly Concentration
              </p>
              <p className="font-caption text-xs text-muted-foreground">
                This variant shows {((anomalousCases / totalCases) * 100).toFixed(1)}% anomaly rate, which is above the threshold
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Icon name="ChartBarIcon" size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-caption text-sm text-foreground font-medium mb-1">
                Process Optimization Opportunity
              </p>
              <p className="font-caption text-xs text-muted-foreground">
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