'use client';

import { useState, useEffect, useRef } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import GlobalHeader from '@/components/common/GlobalHeader';
import LoadingStateManager from '@/components/common/LoadingStateManager';
import DashboardLoadingScreen from '@/components/common/DashboardLoadingScreen';
import PerformanceKPICard from './PerformanceKPICard';
import ProcessStageFilter from './ProcessStageFilter';
import BenchmarkToggle from './BenchmarkToggle';
import CycleTimeTrendChart from './CycleTimeTrendChart';
import ProcessFlowDiagram from './ProcessFlowDiagram';
import ActivityPerformanceRanking from './ActivityPerformanceRanking';
import DetailedPerformanceTable from './DetailedPerformanceTable';
import { useToast } from '@/components/UI/Toast';
import { readSubteamContext, updateSubteamContextIds, SubteamContext } from '@/services/team.service';
import { Upload } from 'lucide-react';

interface ProcessStage { id: string; label: string; count: number; }
interface KPIData { title: string; value: string; unit: string; change: number; changeLabel: string; icon: string; trend: 'up' | 'down' | 'neutral'; }
interface ChartDataPoint { period: string; cycleTime: number; throughput: number; benchmark: number; }
interface ProcessActivity { id: string; name: string; avgDuration: number; isBottleneck: boolean; severity: 'high' | 'medium' | 'low'; caseCount: number; }
interface ActivityRanking { id: string; name: string; avgDuration: number; minDuration: number; maxDuration: number; variance: number; recommendation: string; }
interface PerformanceCase { caseId: string; supplier: string; startDate: string; endDate: string; cycleTime: number; activities: number; bottlenecks: number; status: 'completed' | 'in-progress' | 'delayed'; slaCompliance: boolean; }

const DJANGO = 'http://localhost:8000/api/v1';
const FASTAPI = 'http://localhost:8001/api/v1';
const NODEJS  = 'http://localhost:3001/api/teams';

function mapAggToState(agg: any) {
  const sm = agg.summary || {};
  const kpiKeys = [
    ['average_cycle_time',       'Average Cycle Time',       'ClockIcon'],
    ['processing_throughput',    'Processing Throughput',    'ArrowTrendingUpIcon'],
    ['bottleneck_count',         'Bottleneck Count',         'ExclamationTriangleIcon'],
    ['sla_compliance_rate',      'SLA Compliance Rate',      'CheckCircleIcon'],
    ['activity_duration_variance','Activity Duration Variance','ChartBarIcon'],
    ['process_efficiency_score', 'Process Efficiency Score', 'SparklesIcon'],
  ] as const;

  const kpiData: KPIData[] = kpiKeys.map(([key, title, icon]) => {
    const k = sm[key] || {};
    return {
      title,
      value: String(k.value ?? 0),
      unit: k.unit || '',
      change: k.change_pct ?? 0,
      changeLabel: 'vs last period',
      icon,
      trend: (k.trend || 'neutral') as 'up' | 'down' | 'neutral',
    };
  });

  const wt = (agg.weekly_trends || {}).weeks || [];
  const chartData: ChartDataPoint[] = wt.map((w: any) => ({
    period: w.label || '',
    cycleTime: w.avg_cycle_time_days ?? 0,
    throughput: w.throughput_cases ?? 0,
    benchmark: w.industry_benchmark_days ?? 20,
  }));

  const pf = (agg.process_flow || {}).stages || [];
  const processActivities: ProcessActivity[] = pf.map((s: any) => ({
    id: `act-${s.step}`,
    name: s.activity_name || '',
    avgDuration: s.avg_duration_days ?? 0,
    isBottleneck: !!s.is_bottleneck,
    severity: (s.severity || 'low') as 'high' | 'medium' | 'low',
    caseCount: s.cases_processed ?? 0,
  }));

  const ar = (agg.activity_ranking || {}).activities || [];
  const activityRankings: ActivityRanking[] = ar.map((a: any) => ({
    id: `act-${a.rank}`,
    name: a.activity_name || '',
    avgDuration: a.avg_duration_days ?? 0,
    minDuration: a.min_duration_days ?? 0,
    maxDuration: a.max_duration_days ?? 0,
    variance: a.variance_pct ?? 0,
    recommendation: a.recommendation || '',
  }));

  const cases = (agg.cases || {}).results || [];
  const performanceCases: PerformanceCase[] = cases.map((c: any) => ({
    caseId: c.case_id || '',
    supplier: c.supplier || 'Unknown',
    startDate: c.period_start || '',
    endDate: c.period_end || 'In Progress',
    cycleTime: c.cycle_time_days ?? 0,
    activities: c.activity_count ?? 0,
    bottlenecks: c.bottleneck_count ?? 0,
    status: (() => {
      const s = (c.status || '').toLowerCase();
      if (s === 'completed') return 'completed';
      if (s === 'delayed') return 'delayed';
      return 'in-progress';
    })() as PerformanceCase['status'],
    slaCompliance: !c.sla_breached,
  }));

  const processStages: ProcessStage[] = processActivities.map((a, i) => ({
    id: a.id, label: a.name, count: a.caseCount,
  }));

  return { kpiData, chartData, processActivities, activityRankings, performanceCases, processStages };
}

const PerformanceAnalysisInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIndustryBenchmark, setIsIndustryBenchmark] = useState(true);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);

  const [ctx, setCtx] = useState<SubteamContext | null>(null);
  const [dashData, setDashData] = useState<ReturnType<typeof mapAggToState> | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setIsHydrated(true);
    const c = readSubteamContext();
    setCtx(c);
    if (c?.djangoEventLogId) fetchData(c.djangoEventLogId);
  }, []);

  async function fetchData(eventLogId: string) {
    setDataLoading(true);
    try {
      const res = await fetch(`${DJANGO}/performance/aggregate/?event_log_id=${eventLogId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDashData(mapAggToState(json));
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to load data', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setDataLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!ctx) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const faForm = new FormData();
      faForm.append('file', file);
      const faRes = await fetch(`${FASTAPI}/analyze`, { method: 'POST', body: faForm });
      if (!faRes.ok) throw new Error(`FastAPI error: ${(await faRes.json()).detail || faRes.status}`);
      const faData = await faRes.json();
      const fastApiRunId: string = faData.run_id;

      const djForm = new FormData();
      djForm.append('file', file);
      djForm.append('name', `${ctx.subteamName} — ${file.name}`);
      const djRes = await fetch(`${DJANGO}/event-logs/upload/`, { method: 'POST', body: djForm });
      if (!djRes.ok) throw new Error(`Django error: ${(await djRes.json()).message || djRes.status}`);
      const djData = await djRes.json();
      const djangoEventLogId: string = djData.id;

      await fetch(`${NODEJS}/${ctx.teamId}/subteams/${ctx.subteamId}/data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ fastApiRunId, djangoEventLogId }),
      });

      updateSubteamContextIds(fastApiRunId, djangoEventLogId);
      setCtx(prev => prev ? { ...prev, fastApiRunId, djangoEventLogId } : prev);
      await fetchData(djangoEventLogId);
      showToast({ type: 'success', title: 'Dataset uploaded', message: 'Performance analysis complete' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      showToast({ type: 'error', title: 'Upload failed', message: msg });
    } finally {
      setIsUploading(false);
    }
  }

  const handleRefresh = () => {
    if (ctx?.djangoEventLogId) fetchData(ctx.djangoEventLogId);
    else { setIsLoading(true); setTimeout(() => setIsLoading(false), 800); }
  };

  if (!isHydrated) return <DashboardLoadingScreen dashboardName="Performance Analysis Dashboard" isLoading={true} variant="performance" />;

  if (dataLoading) return <DashboardLoadingScreen dashboardName="Performance Analysis Dashboard" isLoading={true} variant="performance" />;

  if (!ctx?.djangoEventLogId || !dashData) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <NavigationSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
          <GlobalHeader onRefresh={handleRefresh} isLoading={isLoading} />
          <div className="p-8 flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-md">
              <p className="text-sm font-medium text-text-secondary mb-1">{ctx?.subteamName || 'Subteam'}</p>
              <h2 className="text-xl font-semibold text-text-primary mb-6">Performance Analysis Dashboard</h2>
              <div className="bg-bg-secondary border border-border-primary rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Upload size={20} className="text-text-secondary" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-text-primary">Upload a dataset to begin</p>
                </div>
                <p className="text-xs text-text-secondary mb-5">Accepts CSV, XES, or OCEL2 JSON event log files.</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xes,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || !ctx} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium bg-nobel-gold text-bg-primary hover:bg-yellow-500 disabled:opacity-50 transition-colors">
                  {isUploading ? <><span className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" /> Uploading…</> : <><Upload size={15} /> Choose File</>}
                </button>
                {!ctx && <p className="mt-3 text-xs text-red-400">No subteam selected. Return to the profile page and select a subteam.</p>}
                {uploadError && <p className="mt-3 text-xs text-red-400">{uploadError}</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { kpiData, chartData, processActivities, activityRankings, performanceCases, processStages } = dashData!;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
      <NavigationSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
        <GlobalHeader onRefresh={handleRefresh} isLoading={isLoading || dataLoading} />
        <div className="p-8">
          <div className="mb-8 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-secondary mb-1">{ctx.subteamName}</p>
                <h1 className="font-serif text-3xl font-semibold text-text-primary mb-2">Performance Analysis</h1>
                <p className="font-sans text-base text-text-secondary">Identify workflow bottlenecks and optimize P2P cycle times</p>
              </div>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept=".csv,.xes,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50">
                  {isUploading ? <span className="w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin" /> : <Upload size={15} />}
                  Replace
                </button>
                <ProcessStageFilter stages={processStages} selectedStages={selectedStages} onStageToggle={id => setSelectedStages(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} onClearAll={() => setSelectedStages([])} />
                <BenchmarkToggle isIndustryBenchmark={isIndustryBenchmark} onToggle={() => setIsIndustryBenchmark(!isIndustryBenchmark)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {kpiData.map((kpi, i) => <PerformanceKPICard key={i} {...kpi} delay={i * 100} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            <div className="lg:col-span-8">
              <CycleTimeTrendChart data={chartData} isIndustryBenchmark={isIndustryBenchmark} />
            </div>
            <div className="lg:col-span-4">
              <ActivityPerformanceRanking rankings={activityRankings} onActivitySelect={() => {}} />
            </div>
          </div>

          <div className="mb-8">
            <ProcessFlowDiagram activities={processActivities} onActivityClick={() => {}} />
          </div>

          <DetailedPerformanceTable cases={performanceCases} onCaseClick={() => {}} />
        </div>
      </main>
      {(isLoading || dataLoading) && <LoadingStateManager isLoading={true} type="inline" />}
    </div>
  );
};

export default PerformanceAnalysisInteractive;
