'use client';

import { useState, useEffect } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import GlobalHeader from '@/components/common/GlobalHeader';
import AlertNotificationBanner from '@/components/common/AlertNotificationbanner';
import LoadingStateManager from '@/components/common/LoadingStateManager';
import VariantOverviewCards from './VariantOverviewCards';
import VariantFrequencyChart from './VariantFrequencyChart';
import VariantComparisonTable from './VariantComparisonTable';
import VariantAnomalyBreakdown from './VariantAnomalyBreakdown';
import VariantFilters from './VariantFilters';

interface VariantMetric {
  label: string;
  value: string;
  subValue: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: string;
  benchmark?: string;
}

interface VariantDataPoint {
  id: string;
  name: string;
  frequency: number;
  anomalyRate: number;
  caseCount: number;
}

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

interface AnomalySeverity {
  severity: string;
  count: number;
  percentage: number;
  color: string;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  actionLabel?: string;
  onAction?: () => void;
}

const VariantAnalysisInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    setIsHydrated(true);
    
    // Mock alerts
    setAlerts([
      {
        id: 'alert-1',
        type: 'warning',
        title: 'High Anomaly Rate Detected',
        message: 'Variant V-003 shows 18.5% anomaly rate, exceeding the 15% threshold',
        timestamp: new Date('2026-02-02T01:15:00'),
        actionLabel: 'View Details',
        onAction: () => setSelectedVariant('V-003')
      }
    ]);
  }, []);

  if (!isHydrated) {
    return <LoadingStateManager isLoading={true} loadingText="Loading Variant Analysis Dashboard..." />;
  }

  const mockMetrics: VariantMetric[] = [
    {
      label: 'Total Variants Detected',
      value: '47',
      subValue: 'Across 12,847 cases',
      trend: 'up',
      trendValue: '+3',
      icon: 'AdjustmentsHorizontalIcon',
      benchmark: '42 variants (baseline)'
    },
    {
      label: 'Most Frequent Variant',
      value: 'V-001',
      subValue: '28.5% of all cases',
      trend: 'neutral',
      trendValue: '0%',
      icon: 'ChartBarIcon',
      benchmark: 'Standard P2P flow'
    },
    {
      label: 'Highest Anomaly Rate',
      value: 'V-003',
      subValue: '18.5% anomaly rate',
      trend: 'down',
      trendValue: '-2.3%',
      icon: 'ExclamationTriangleIcon',
      benchmark: '15% threshold'
    },
    {
      label: 'Conformance Fitness',
      value: '87.2%',
      subValue: 'Overall process conformance',
      trend: 'up',
      trendValue: '+1.8%',
      icon: 'CheckCircleIcon',
      benchmark: '85% target'
    }
  ];

  const mockChartData: VariantDataPoint[] = [
    { id: 'V-001', name: 'Standard Flow', frequency: 28.5, anomalyRate: 5.2, caseCount: 3661 },
    { id: 'V-002', name: 'Express Processing', frequency: 18.3, anomalyRate: 8.7, caseCount: 2351 },
    { id: 'V-003', name: 'Manual Approval', frequency: 12.7, anomalyRate: 18.5, caseCount: 1632 },
    { id: 'V-004', name: 'Three-Way Match', frequency: 15.2, anomalyRate: 6.3, caseCount: 1953 },
    { id: 'V-005', name: 'Expedited Payment', frequency: 8.9, anomalyRate: 12.1, caseCount: 1143 },
    { id: 'V-006', name: 'Budget Approval', frequency: 6.4, anomalyRate: 15.8, caseCount: 822 },
    { id: 'V-007', name: 'Multi-Level Review', frequency: 4.8, anomalyRate: 9.4, caseCount: 617 },
    { id: 'V-008', name: 'Direct Payment', frequency: 3.2, anomalyRate: 7.6, caseCount: 411 },
    { id: 'V-009', name: 'Contract-Based', frequency: 2.0, anomalyRate: 4.9, caseCount: 257 }
  ];

  const mockVariants: VariantRow[] = [
    {
      id: 'V-001',
      variantPath: 'Standard Flow',
      frequency: 28.5,
      anomalyRate: 5.2,
      conformanceScore: 94.8,
      caseCount: 3661,
      avgDuration: '4.2 days',
      activities: ['Create PR', 'Approve PR', 'Create PO', 'Receive Goods', 'Match Invoice', 'Process Payment']
    },
    {
      id: 'V-002',
      variantPath: 'Express Processing',
      frequency: 18.3,
      anomalyRate: 8.7,
      conformanceScore: 91.3,
      caseCount: 2351,
      avgDuration: '2.1 days',
      activities: ['Create PR', 'Fast-Track Approval', 'Create PO', 'Receive Goods', 'Process Payment']
    },
    {
      id: 'V-003',
      variantPath: 'Manual Approval',
      frequency: 12.7,
      anomalyRate: 18.5,
      conformanceScore: 81.5,
      caseCount: 1632,
      avgDuration: '8.7 days',
      activities: ['Create PR', 'Manual Review', 'Budget Check', 'Approve PR', 'Create PO', 'Receive Goods', 'Match Invoice', 'Manual Approval', 'Process Payment']
    },
    {
      id: 'V-004',
      variantPath: 'Three-Way Match',
      frequency: 15.2,
      anomalyRate: 6.3,
      conformanceScore: 93.7,
      caseCount: 1953,
      avgDuration: '5.1 days',
      activities: ['Create PR', 'Approve PR', 'Create PO', 'Receive Goods', 'Three-Way Match', 'Process Payment']
    },
    {
      id: 'V-005',
      variantPath: 'Expedited Payment',
      frequency: 8.9,
      anomalyRate: 12.1,
      conformanceScore: 87.9,
      caseCount: 1143,
      avgDuration: '1.8 days',
      activities: ['Create PR', 'Emergency Approval', 'Create PO', 'Expedited Payment']
    },
    {
      id: 'V-006',
      variantPath: 'Budget Approval',
      frequency: 6.4,
      anomalyRate: 15.8,
      conformanceScore: 84.2,
      caseCount: 822,
      avgDuration: '7.3 days',
      activities: ['Create PR', 'Budget Review', 'Finance Approval', 'Approve PR', 'Create PO', 'Receive Goods', 'Match Invoice', 'Process Payment']
    }
  ];

  const mockSeverityData: AnomalySeverity[] = [
    { severity: 'Critical', count: 187, percentage: 32.5, color: '#ef4444' },
    { severity: 'High', count: 243, percentage: 42.2, color: '#f59e0b' },
    { severity: 'Medium', count: 98, percentage: 17.0, color: '#eab308' },
    { severity: 'Low', count: 48, percentage: 8.3, color: '#10b981' }
  ];

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const handleVariantClick = (variantId: string) => {
    setSelectedVariant(variantId);
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariant(variantId);
  };

  const handleFrequencyFilterChange = (min: number, max: number) => {
    console.log('Frequency filter changed:', min, max);
  };

  const handleConformanceThresholdChange = (threshold: number) => {
    console.log('Conformance threshold changed:', threshold);
  };

  const handleDateRangeChange = (range: string) => {
    console.log('Date range changed:', range);
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const selectedVariantData = mockVariants.find(v => v.id === selectedVariant);
  const totalCases = selectedVariantData?.caseCount || 0;
  const anomalousCases = Math.round(totalCases * ((selectedVariantData?.anomalyRate || 0) / 100));

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
      <AlertNotificationBanner alerts={alerts} onDismiss={handleDismissAlert} />
      
      <NavigationSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
        <GlobalHeader onRefresh={handleRefresh} isLoading={isLoading} />

        <div className="p-8">
          <div className="mb-8 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <h1 className="font-serif text-3xl font-semibold text-text-primary mb-2">
              Variant Analysis Dashboard
            </h1>
            <p className="font-sans text-base text-text-secondary">
              Process deviation analysis and conformance tracking for audit and optimization
            </p>
          </div>

          <div className="space-y-6">
            <VariantOverviewCards metrics={mockMetrics} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <VariantFrequencyChart
                  data={mockChartData}
                  onVariantClick={handleVariantClick}
                />

                <VariantComparisonTable
                  variants={mockVariants}
                  onVariantSelect={handleVariantSelect}
                />
              </div>

              <div className="space-y-6">
                <VariantFilters
                  onFrequencyFilterChange={handleFrequencyFilterChange}
                  onConformanceThresholdChange={handleConformanceThresholdChange}
                  onDateRangeChange={handleDateRangeChange}
                />

                <VariantAnomalyBreakdown
                  selectedVariant={selectedVariant}
                  severityData={mockSeverityData}
                  totalCases={totalCases}
                  anomalousCases={anomalousCases}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {isLoading && <LoadingStateManager isLoading={true} type="inline" />}
    </div>
  );
};

export default VariantAnalysisInteractive;