'use client';

import { useState, useEffect } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import GlobalHeader from '@/components/common/GlobalHeader';
import AlertNotificationBanner from '../../../components/common/AlertNotificationbanner';
import LoadingStateManager from '@/components/common/LoadingStateManager';
import PerformanceKPICard from './PerformanceKPICard';
import ProcessStageFilter from './ProcessStageFilter';
import BenchmarkToggle from './BenchmarkToggle';
import CycleTimeTrendChart from './CycleTimeTrendChart';
import ProcessFlowDiagram from './ProcessFlowDiagram';
import ActivityPerformanceRanking from './ActivityPerformanceRanking';
import DetailedPerformanceTable from './DetailedPerformanceTable';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  actionLabel?: string;
  onAction?: () => void;
}

interface ProcessStage {
  id: string;
  label: string;
  count: number;
}

interface KPIData {
  title: string;
  value: string;
  unit: string;
  change: number;
  changeLabel: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
}

interface ChartDataPoint {
  period: string;
  cycleTime: number;
  throughput: number;
  benchmark: number;
}

interface ProcessActivity {
  id: string;
  name: string;
  avgDuration: number;
  isBottleneck: boolean;
  severity: 'high' | 'medium' | 'low';
  caseCount: number;
}

interface ActivityRanking {
  id: string;
  name: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  variance: number;
  recommendation: string;
}

interface PerformanceCase {
  caseId: string;
  supplier: string;
  startDate: string;
  endDate: string;
  cycleTime: number;
  activities: number;
  bottlenecks: number;
  status: 'completed' | 'in-progress' | 'delayed';
  slaCompliance: boolean;
}

const PerformanceAnalysisInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIndustryBenchmark, setIsIndustryBenchmark] = useState(true);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    setIsHydrated(true);
    
    // Mock alerts
    setAlerts([
      {
        id: 'alert-1',
        type: 'warning',
        title: 'High Cycle Time Detected',
        message: 'Invoice Approval activity showing 35% increase in processing time over last 7 days',
        timestamp: new Date(2026, 1, 2, 1, 15),
        actionLabel: 'View Details',
        onAction: () => console.log('View alert details')
      }
    ]);
  }, []);

  if (!isHydrated) {
    return <LoadingStateManager isLoading={true} type="overlay" />;
  }

  const processStages: ProcessStage[] = [
    { id: 'requisition', label: 'Purchase Requisition', count: 1247 },
    { id: 'approval', label: 'Approval Workflow', count: 1189 },
    { id: 'po-creation', label: 'PO Creation', count: 1156 },
    { id: 'goods-receipt', label: 'Goods Receipt', count: 1098 },
    { id: 'invoice-processing', label: 'Invoice Processing', count: 1045 },
    { id: 'payment', label: 'Payment Processing', count: 987 }
  ];

  const kpiData: KPIData[] = [
    {
      title: 'Average Cycle Time',
      value: '18.5',
      unit: 'days',
      change: -12.3,
      changeLabel: 'vs last month',
      icon: 'ClockIcon',
      trend: 'down'
    },
    {
      title: 'Processing Throughput',
      value: '1,247',
      unit: 'cases/month',
      change: 8.7,
      changeLabel: 'vs last month',
      icon: 'ArrowTrendingUpIcon',
      trend: 'up'
    },
    {
      title: 'Bottleneck Count',
      value: '23',
      unit: 'activities',
      change: -15.2,
      changeLabel: 'vs last month',
      icon: 'ExclamationTriangleIcon',
      trend: 'down'
    },
    {
      title: 'SLA Compliance Rate',
      value: '87.3',
      unit: '%',
      change: 5.1,
      changeLabel: 'vs last month',
      icon: 'CheckCircleIcon',
      trend: 'up'
    },
    {
      title: 'Activity Duration Variance',
      value: '34.2',
      unit: '%',
      change: -8.9,
      changeLabel: 'vs last month',
      icon: 'ChartBarIcon',
      trend: 'down'
    },
    {
      title: 'Process Efficiency Score',
      value: '78.5',
      unit: '/100',
      change: 3.4,
      changeLabel: 'vs last month',
      icon: 'SparklesIcon',
      trend: 'up'
    }
  ];

  const chartData: ChartDataPoint[] = [
    { period: 'Week 1', cycleTime: 22.3, throughput: 287, benchmark: 20.0 },
    { period: 'Week 2', cycleTime: 20.8, throughput: 312, benchmark: 20.0 },
    { period: 'Week 3', cycleTime: 19.2, throughput: 298, benchmark: 20.0 },
    { period: 'Week 4', cycleTime: 18.5, throughput: 350, benchmark: 20.0 },
    { period: 'Week 5', cycleTime: 17.9, throughput: 324, benchmark: 20.0 },
    { period: 'Week 6', cycleTime: 18.1, throughput: 289, benchmark: 20.0 },
    { period: 'Week 7', cycleTime: 17.4, throughput: 341, benchmark: 20.0 }
  ];

  const processActivities: ProcessActivity[] = [
    {
      id: 'act-1',
      name: 'Purchase Requisition Creation',
      avgDuration: 2.3,
      isBottleneck: false,
      severity: 'low',
      caseCount: 1247
    },
    {
      id: 'act-2',
      name: 'Budget Approval',
      avgDuration: 4.8,
      isBottleneck: false,
      severity: 'medium',
      caseCount: 1189
    },
    {
      id: 'act-3',
      name: 'Manager Approval',
      avgDuration: 12.5,
      isBottleneck: true,
      severity: 'high',
      caseCount: 1189
    },
    {
      id: 'act-4',
      name: 'Purchase Order Creation',
      avgDuration: 1.9,
      isBottleneck: false,
      severity: 'low',
      caseCount: 1156
    },
    {
      id: 'act-5',
      name: 'Goods Receipt Verification',
      avgDuration: 8.7,
      isBottleneck: true,
      severity: 'medium',
      caseCount: 1098
    },
    {
      id: 'act-6',
      name: 'Invoice Processing',
      avgDuration: 15.3,
      isBottleneck: true,
      severity: 'high',
      caseCount: 1045
    },
    {
      id: 'act-7',
      name: 'Three-Way Matching',
      avgDuration: 6.2,
      isBottleneck: false,
      severity: 'medium',
      caseCount: 1045
    },
    {
      id: 'act-8',
      name: 'Payment Authorization',
      avgDuration: 3.4,
      isBottleneck: false,
      severity: 'low',
      caseCount: 987
    }
  ];

  const activityRankings: ActivityRanking[] = [
    {
      id: 'act-6',
      name: 'Invoice Processing',
      avgDuration: 15.3,
      minDuration: 8.2,
      maxDuration: 28.7,
      variance: 67.3,
      recommendation: 'Implement automated invoice validation to reduce manual review time by 40%'
    },
    {
      id: 'act-3',
      name: 'Manager Approval',
      avgDuration: 12.5,
      minDuration: 2.1,
      maxDuration: 35.8,
      variance: 94.2,
      recommendation: 'Set up approval delegation rules and automated escalation for pending requests'
    },
    {
      id: 'act-5',
      name: 'Goods Receipt Verification',
      avgDuration: 8.7,
      minDuration: 4.3,
      maxDuration: 18.9,
      variance: 56.8,
      recommendation: 'Deploy mobile scanning solution for warehouse teams to expedite verification'
    },
    {
      id: 'act-7',
      name: 'Three-Way Matching',
      avgDuration: 6.2,
      minDuration: 3.8,
      maxDuration: 12.4,
      variance: 45.2,
      recommendation: 'Increase matching tolerance thresholds for low-value items to reduce exceptions'
    },
    {
      id: 'act-2',
      name: 'Budget Approval',
      avgDuration: 4.8,
      minDuration: 2.9,
      maxDuration: 9.1,
      variance: 38.7,
      recommendation: 'Pre-approve recurring purchases within budget limits to streamline workflow'
    }
  ];

  const performanceCases: PerformanceCase[] = [
    {
      caseId: 'PO-2026-00847',
      supplier: 'Global Tech Supplies Inc',
      startDate: '2026-01-15',
      endDate: '2026-02-01',
      cycleTime: 17,
      activities: 8,
      bottlenecks: 2,
      status: 'completed',
      slaCompliance: true
    },
    {
      caseId: 'PO-2026-00846',
      supplier: 'Office Essentials Ltd',
      startDate: '2026-01-14',
      endDate: '2026-02-02',
      cycleTime: 19,
      activities: 8,
      bottlenecks: 1,
      status: 'completed',
      slaCompliance: true
    },
    {
      caseId: 'PO-2026-00845',
      supplier: 'Industrial Equipment Corp',
      startDate: '2026-01-12',
      endDate: 'In Progress',
      cycleTime: 21,
      activities: 6,
      bottlenecks: 3,
      status: 'in-progress',
      slaCompliance: false
    },
    {
      caseId: 'PO-2026-00844',
      supplier: 'Packaging Solutions Group',
      startDate: '2026-01-10',
      endDate: '2026-01-28',
      cycleTime: 18,
      activities: 8,
      bottlenecks: 1,
      status: 'completed',
      slaCompliance: true
    },
    {
      caseId: 'PO-2026-00843',
      supplier: 'Digital Services Provider',
      startDate: '2026-01-08',
      endDate: 'In Progress',
      cycleTime: 25,
      activities: 7,
      bottlenecks: 4,
      status: 'delayed',
      slaCompliance: false
    },
    {
      caseId: 'PO-2026-00842',
      supplier: 'Manufacturing Parts Co',
      startDate: '2026-01-05',
      endDate: '2026-01-20',
      cycleTime: 15,
      activities: 8,
      bottlenecks: 0,
      status: 'completed',
      slaCompliance: true
    },
    {
      caseId: 'PO-2026-00841',
      supplier: 'Logistics & Transport Ltd',
      startDate: '2026-01-03',
      endDate: '2026-01-25',
      cycleTime: 22,
      activities: 8,
      bottlenecks: 2,
      status: 'completed',
      slaCompliance: false
    },
    {
      caseId: 'PO-2026-00840',
      supplier: 'Safety Equipment Suppliers',
      startDate: '2025-12-28',
      endDate: '2026-01-18',
      cycleTime: 21,
      activities: 8,
      bottlenecks: 1,
      status: 'completed',
      slaCompliance: true
    }
  ];

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const handleStageToggle = (stageId: string) => {
    setSelectedStages(prev => 
      prev.includes(stageId) 
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const handleClearStages = () => {
    setSelectedStages([]);
  };

  const handleActivityClick = (activityId: string) => {
    console.log('Activity clicked:', activityId);
  };

  const handleActivitySelect = (activityId: string) => {
    console.log('Activity selected:', activityId);
  };

  const handleCaseClick = (caseId: string) => {
    console.log('Case clicked:', caseId);
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  return (
    <div className="min-h-screen bg-background">
      <AlertNotificationBanner 
        alerts={alerts}
        onDismiss={handleDismissAlert}
      />
      
      <NavigationSidebar 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
        <GlobalHeader 
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
        
        <div className="p-lg">
          {/* Page Header */}
          <div className="mb-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-heading text-3xl font-semibold text-foreground mb-2">
                  Performance Analysis Dashboard
                </h1>
                <p className="font-caption text-base text-muted-foreground">
                  Identify workflow bottlenecks and optimize P2P cycle times through comprehensive performance metrics
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <ProcessStageFilter
                  stages={processStages}
                  selectedStages={selectedStages}
                  onStageToggle={handleStageToggle}
                  onClearAll={handleClearStages}
                />
                <BenchmarkToggle
                  isIndustryBenchmark={isIndustryBenchmark}
                  onToggle={() => setIsIndustryBenchmark(!isIndustryBenchmark)}
                />
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-lg">
            {kpiData.map((kpi, index) => (
              <PerformanceKPICard key={index} {...kpi} />
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-lg">
            {/* Cycle Time Trend Chart */}
            <div className="lg:col-span-8">
              <CycleTimeTrendChart 
                data={chartData}
                isIndustryBenchmark={isIndustryBenchmark}
              />
            </div>

            {/* Activity Performance Ranking */}
            <div className="lg:col-span-4">
              <ActivityPerformanceRanking
                rankings={activityRankings}
                onActivitySelect={handleActivitySelect}
              />
            </div>
          </div>

          {/* Process Flow Diagram */}
          <div className="mb-lg">
            <ProcessFlowDiagram
              activities={processActivities}
              onActivityClick={handleActivityClick}
            />
          </div>

          {/* Detailed Performance Table */}
          <DetailedPerformanceTable
            cases={performanceCases}
            onCaseClick={handleCaseClick}
          />
        </div>
      </main>

      {isLoading && <LoadingStateManager isLoading={true} type="overlay" />}
    </div>
  );
};

export default PerformanceAnalysisInteractive;