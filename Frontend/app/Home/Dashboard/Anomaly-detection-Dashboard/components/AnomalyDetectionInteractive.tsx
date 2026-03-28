'use client';

import { useState, useEffect } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import GlobalHeader from '@/components/common/GlobalHeader';
import AlertNotificationBanner from '@/components/common/AlertNotificationbanner';
import LoadingStateManager from '@/components/common/LoadingStateManager';
import KPIMetricCard from './KPIMetricCard';
import AnomalyTableRow from './anomalyTableRow';
import RealTimeAnomalyFeed from './RealTimeAnomalyFeed';
import ProcessMapVisualization from './ProcessMapVisualization';
import FilterPanel from './FilterPanel';
import Icon from '@/components/UI/AppIcon';

interface KPIData {
  totalCases: number;
  anomalousCases: number;
  anomalyRate: number;
  avgProcessingTime: string;
  trends: {
    totalCases: number;
    anomalousCases: number;
    anomalyRate: number;
    avgProcessingTime: number;
  };
  sparklines: {
    totalCases: number[];
    anomalousCases: number[];
    anomalyRate: number[];
    avgProcessingTime: number[];
  };
}

interface AnomalyCase {
  id: string;
  caseId: string;
  supplier: string;
  amount: string;
  anomalyType: string;
  severityScore: number;
  status: 'open' | 'investigating' | 'resolved' | 'false-positive';
  timestamp: string;
}

interface AnomalyFeedItem {
  id: string;
  caseId: string;
  supplier: string;
  anomalyType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  amount: string;
}

interface ProcessNode {
  id: string;
  label: string;
  anomalyCount: number;
  totalCases: number;
}

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

const AnomalyDetectionInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessMapExpanded, setIsProcessMapExpanded] = useState(true);
  const [selectedAnomalyTypes, setSelectedAnomalyTypes] = useState<string[]>([]);
  const [selectedSeverityLevels, setSelectedSeverityLevels] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const kpiData: KPIData = {
    totalCases: 12847,
    anomalousCases: 1523,
    anomalyRate: 11.85,
    avgProcessingTime: '4.2 days',
    trends: {
      totalCases: 8.3,
      anomalousCases: 15.7,
      anomalyRate: 6.8,
      avgProcessingTime: -12.4
    },
    sparklines: {
      totalCases: [8200, 8900, 9500, 10200, 11100, 11800, 12847],
      anomalousCases: [980, 1050, 1180, 1290, 1380, 1450, 1523],
      anomalyRate: [11.95, 11.80, 12.42, 12.65, 12.43, 12.29, 11.85],
      avgProcessingTime: [4.8, 4.7, 4.5, 4.4, 4.3, 4.2, 4.2]
    }
  };

  const anomalyCases: AnomalyCase[] = [
    {
      id: '1',
      caseId: 'PO-2026-00847',
      supplier: 'Global Tech Solutions Inc.',
      amount: '$127,450.00',
      anomalyType: 'Price Mismatch',
      severityScore: 0.92,
      status: 'open',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      caseId: 'PO-2026-00846',
      supplier: 'Enterprise Systems Corp',
      amount: '$89,320.00',
      anomalyType: 'Three-Way Match Failure',
      severityScore: 0.87,
      status: 'investigating',
      timestamp: '3 hours ago'
    },
    {
      id: '3',
      caseId: 'PO-2026-00845',
      supplier: 'Industrial Supplies Ltd',
      amount: '$45,680.00',
      anomalyType: 'Maverick Buying',
      severityScore: 0.78,
      status: 'open',
      timestamp: '5 hours ago'
    },
    {
      id: '4',
      caseId: 'PO-2026-00844',
      supplier: 'Tech Innovations LLC',
      amount: '$156,890.00',
      anomalyType: 'Temporal Delay',
      severityScore: 0.65,
      status: 'investigating',
      timestamp: '6 hours ago'
    },
    {
      id: '5',
      caseId: 'PO-2026-00843',
      supplier: 'Manufacturing Partners Inc',
      amount: '$92,340.00',
      anomalyType: 'Duplicate Invoice',
      severityScore: 0.94,
      status: 'resolved',
      timestamp: '8 hours ago'
    },
    {
      id: '6',
      caseId: 'PO-2026-00842',
      supplier: 'Office Supplies Direct',
      amount: '$12,450.00',
      anomalyType: 'Price Mismatch',
      severityScore: 0.58,
      status: 'false-positive',
      timestamp: '10 hours ago'
    },
    {
      id: '7',
      caseId: 'PO-2026-00841',
      supplier: 'Cloud Services Provider',
      amount: '$234,560.00',
      anomalyType: 'Unauthorized Vendor',
      severityScore: 0.89,
      status: 'open',
      timestamp: '12 hours ago'
    },
    {
      id: '8',
      caseId: 'PO-2026-00840',
      supplier: 'Logistics Solutions Group',
      amount: '$67,890.00',
      anomalyType: 'Three-Way Match Failure',
      severityScore: 0.72,
      status: 'investigating',
      timestamp: '14 hours ago'
    }
  ];

  const feedItems: AnomalyFeedItem[] = [
    {
      id: '1',
      caseId: 'PO-2026-00847',
      supplier: 'Global Tech Solutions Inc.',
      anomalyType: 'Price Mismatch',
      severity: 'critical',
      timestamp: '2h ago',
      amount: '$127,450.00'
    },
    {
      id: '2',
      caseId: 'PO-2026-00846',
      supplier: 'Enterprise Systems Corp',
      anomalyType: 'Three-Way Match Failure',
      severity: 'high',
      timestamp: '3h ago',
      amount: '$89,320.00'
    },
    {
      id: '3',
      caseId: 'PO-2026-00845',
      supplier: 'Industrial Supplies Ltd',
      anomalyType: 'Maverick Buying',
      severity: 'high',
      timestamp: '5h ago',
      amount: '$45,680.00'
    },
    {
      id: '4',
      caseId: 'PO-2026-00844',
      supplier: 'Tech Innovations LLC',
      anomalyType: 'Temporal Delay',
      severity: 'medium',
      timestamp: '6h ago',
      amount: '$156,890.00'
    }
  ];

  const processNodes: ProcessNode[] = [
    { id: '1', label: 'Purchase Requisition', anomalyCount: 145, totalCases: 2847 },
    { id: '2', label: 'Purchase Order Creation', anomalyCount: 287, totalCases: 2847 },
    { id: '3', label: 'Goods Receipt', anomalyCount: 423, totalCases: 2847 },
    { id: '4', label: 'Invoice Verification', anomalyCount: 512, totalCases: 2847 },
    { id: '5', label: 'Payment Processing', anomalyCount: 156, totalCases: 2847 }
  ];

  const anomalyTypeOptions: FilterOption[] = [
    { id: 'price-mismatch', label: 'Price Mismatch', count: 342 },
    { id: 'three-way-match', label: 'Three-Way Match Failure', count: 287 },
    { id: 'maverick-buying', label: 'Maverick Buying', count: 234 },
    { id: 'temporal-delay', label: 'Temporal Delay', count: 198 },
    { id: 'duplicate-invoice', label: 'Duplicate Invoice', count: 156 },
    { id: 'unauthorized-vendor', label: 'Unauthorized Vendor', count: 143 },
    { id: 'quantity-variance', label: 'Quantity Variance', count: 163 }
  ];

  const severityLevelOptions: FilterOption[] = [
    { id: 'critical', label: 'Critical (80-100%)', count: 234 },
    { id: 'high', label: 'High (60-79%)', count: 456 },
    { id: 'medium', label: 'Medium (40-59%)', count: 567 },
    { id: 'low', label: 'Low (0-39%)', count: 266 }
  ];

  const supplierOptions: FilterOption[] = [
    { id: 'global-tech', label: 'Global Tech Solutions Inc.', count: 87 },
    { id: 'enterprise-systems', label: 'Enterprise Systems Corp', count: 65 },
    { id: 'industrial-supplies', label: 'Industrial Supplies Ltd', count: 54 },
    { id: 'tech-innovations', label: 'Tech Innovations LLC', count: 48 },
    { id: 'manufacturing-partners', label: 'Manufacturing Partners Inc', count: 42 },
    { id: 'office-supplies', label: 'Office Supplies Direct', count: 38 },
    { id: 'cloud-services', label: 'Cloud Services Provider', count: 35 },
    { id: 'logistics-solutions', label: 'Logistics Solutions Group', count: 31 }
  ];

  const alerts = [
    {
      id: '1',
      type: 'critical' as const,
      title: 'High-Value Anomaly Detected',
      message: 'Purchase order PO-2026-00847 flagged with 92% severity score for price mismatch exceeding $127K',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      actionLabel: 'View Details',
      onAction: () => console.log('View anomaly details')
    }
  ];

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const handleRowClick = (caseId: string) => {
    console.log('View case details:', caseId);
  };

  const handleFeedItemClick = (caseId: string) => {
    console.log('View case from feed:', caseId);
  };

  const handleClearFilters = () => {
    setSelectedAnomalyTypes([]);
    setSelectedSeverityLevels([]);
    setSelectedSuppliers([]);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  if (!isHydrated) {
    return <LoadingStateManager isLoading={true} type="overlay" />;
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
      <AlertNotificationBanner alerts={alerts} />
      <NavigationSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
        <GlobalHeader onRefresh={handleRefresh} isLoading={isLoading} />

        <div className="p-8">
          {/* Page Title */}
          <div className="mb-8 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <h1 className="font-serif text-3xl font-bold text-text-primary mb-2">
              Anomaly Detection Dashboard
            </h1>
            <p className="font-sans text-base text-text-secondary">
              Real-time monitoring and immediate response hub for procurement irregularities
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPIMetricCard
              title="Total Cases"
              value={kpiData.totalCases.toLocaleString()}
              trend={kpiData.trends.totalCases}
              trendLabel="vs last period"
              icon="DocumentTextIcon"
              sparklineData={kpiData.sparklines.totalCases}
              status="neutral"
              delay={0}
            />
            <KPIMetricCard
              title="Anomalous Cases"
              value={kpiData.anomalousCases.toLocaleString()}
              trend={kpiData.trends.anomalousCases}
              trendLabel="vs last period"
              icon="ExclamationTriangleIcon"
              sparklineData={kpiData.sparklines.anomalousCases}
              status="error"
              delay={100}
            />
            <KPIMetricCard
              title="Anomaly Rate"
              value={`${kpiData.anomalyRate}%`}
              trend={kpiData.trends.anomalyRate}
              trendLabel="vs last period"
              icon="ChartBarIcon"
              sparklineData={kpiData.sparklines.anomalyRate}
              status="warning"
              delay={200}
            />
            <KPIMetricCard
              title="Avg Processing Time"
              value={kpiData.avgProcessingTime}
              trend={kpiData.trends.avgProcessingTime}
              trendLabel="vs last period"
              icon="ClockIcon"
              sparklineData={kpiData.sparklines.avgProcessingTime}
              status="success"
              delay={300}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Filters */}
            <div className="lg:col-span-3">
              <FilterPanel
                anomalyTypes={anomalyTypeOptions}
                severityLevels={severityLevelOptions}
                suppliers={supplierOptions}
                selectedAnomalyTypes={selectedAnomalyTypes}
                selectedSeverityLevels={selectedSeverityLevels}
                selectedSuppliers={selectedSuppliers}
                onAnomalyTypeChange={setSelectedAnomalyTypes}
                onSeverityLevelChange={setSelectedSeverityLevels}
                onSupplierChange={setSelectedSuppliers}
                onClearAll={handleClearFilters}
              />
            </div>

            {/* Middle Column - Anomaly Table */}
            <div className="lg:col-span-6">
              <div className="bg-bg-secondary border border-border-primary rounded-xl">
                <div className="flex items-center justify-between p-4 border-b border-border-primary">
                  <h3 className="font-serif text-base font-semibold text-text-primary">
                    Anomaly Cases
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-sm text-text-secondary">
                      {anomalyCases.length} results
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-bg-primary/50 border-b border-border-primary">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('caseId')}
                            className="flex items-center gap-2 font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Case ID
                            <Icon name="ChevronUpDownIcon" size={16} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('supplier')}
                            className="flex items-center gap-2 font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Supplier
                            <Icon name="ChevronUpDownIcon" size={16} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('amount')}
                            className="flex items-center gap-2 font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Amount
                            <Icon name="ChevronUpDownIcon" size={16} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('anomalyType')}
                            className="flex items-center gap-2 font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Anomaly Type
                            <Icon name="ChevronUpDownIcon" size={16} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('severityScore')}
                            className="flex items-center gap-2 font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Severity
                            <Icon name="ChevronUpDownIcon" size={16} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('status')}
                            className="flex items-center gap-2 font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Status
                            <Icon name="ChevronUpDownIcon" size={16} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('timestamp')}
                            className="flex items-center gap-2 font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Time
                            <Icon name="ChevronUpDownIcon" size={16} />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalyCases.map(anomaly => (
                        <AnomalyTableRow
                          key={anomaly.id}
                          caseId={anomaly.caseId}
                          supplier={anomaly.supplier}
                          amount={anomaly.amount}
                          anomalyType={anomaly.anomalyType}
                          severityScore={anomaly.severityScore}
                          status={anomaly.status}
                          timestamp={anomaly.timestamp}
                          onRowClick={() => handleRowClick(anomaly.caseId)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-border-primary">
                  <span className="font-sans text-sm text-text-secondary">
                    Showing 1-8 of {anomalyCases.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors font-sans text-sm font-medium text-text-primary border border-border-primary">
                      Previous
                    </button>
                    <button className="px-3 py-2 rounded-lg bg-nobel-gold text-white hover:bg-nobel-gold/90 transition-colors font-sans text-sm font-medium">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Feed & Process Map */}
            <div className="lg:col-span-3 space-y-6">
              <RealTimeAnomalyFeed items={feedItems} onItemClick={handleFeedItemClick} />
              <ProcessMapVisualization
                nodes={processNodes}
                isExpanded={isProcessMapExpanded}
                onToggleExpand={() => setIsProcessMapExpanded(!isProcessMapExpanded)}
              />
            </div>
          </div>
        </div>
      </main>

      {isLoading && <LoadingStateManager isLoading={true} type="inline" />}
    </div>
  );
};

export default AnomalyDetectionInteractive;