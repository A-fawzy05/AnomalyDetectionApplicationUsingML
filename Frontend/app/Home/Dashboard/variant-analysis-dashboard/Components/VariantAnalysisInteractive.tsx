'use client';

import { useState, useEffect, useRef } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import GlobalHeader from '@/components/common/GlobalHeader';
import LoadingStateManager from '@/components/common/LoadingStateManager';
import DashboardLoadingScreen from '@/components/common/DashboardLoadingScreen';
import VariantOverviewCards from './VariantOverviewCards';
import VariantFrequencyChart from './VariantFrequencyChart';
import VariantComparisonTable from './VariantComparisonTable';
import VariantAnomalyBreakdown from './VariantAnomalyBreakdown';
import VariantFilters from './VariantFilters';
import { useToast } from '@/components/UI/Toast';
import { readSubteamContext, updateSubteamContextIds, SubteamContext } from '@/services/team.service';
import { Upload } from 'lucide-react';
import Icon from '@/components/UI/AppIcon';

interface VariantMetric { label: string; value: string; subValue: string; trend: 'up' | 'down' | 'neutral'; trendValue: string; icon: string; benchmark?: string; }
interface VariantDataPoint { id: string; name: string; frequency: number; anomalyRate: number; caseCount: number; }
interface VariantRow { id: string; variantPath: string; frequency: number; anomalyRate: number; conformanceScore: number; caseCount: number; avgDuration: string; activities: string[]; }
interface AnomalySeverity { severity: string; count: number; percentage: number; color: string; }

const DJANGO  = 'http://localhost:8000/api/v1';
const FASTAPI = 'http://localhost:8001/api/v1';
const NODEJS  = 'http://localhost:3001/api/teams';

function mapAggToState(agg: any) {
  const sm = agg.summary || {};

  const metrics: VariantMetric[] = [
    {
      label: 'Total Variants Detected',
      value: String(sm.total_variants_detected?.value ?? 0),
      subValue: `Across all cases`,
      trend: (sm.total_variants_detected?.trend || 'neutral') as 'up' | 'down' | 'neutral',
      trendValue: `+${sm.total_variants_detected?.change ?? 0}`,
      icon: 'AdjustmentsHorizontalIcon',
      benchmark: sm.total_variants_detected?.benchmark_label || '',
    },
    {
      label: 'Most Frequent Variant',
      value: `V-${sm.most_frequent_variant?.variant_id ?? 0}`,
      subValue: `${(sm.most_frequent_variant?.frequency_pct ?? 0).toFixed(1)}% of all cases`,
      trend: (sm.most_frequent_variant?.trend || 'neutral') as 'up' | 'down' | 'neutral',
      trendValue: `${sm.most_frequent_variant?.change_pct ?? 0}%`,
      icon: 'ChartBarIcon',
      benchmark: sm.most_frequent_variant?.benchmark_label || '',
    },
    {
      label: 'Highest Anomaly Rate',
      value: `V-${sm.highest_anomaly_rate_variant?.variant_id ?? 0}`,
      subValue: `${(sm.highest_anomaly_rate_variant?.anomaly_rate_pct ?? 0).toFixed(1)}% anomaly rate`,
      trend: (sm.highest_anomaly_rate_variant?.trend || 'neutral') as 'up' | 'down' | 'neutral',
      trendValue: `${sm.highest_anomaly_rate_variant?.change_pct ?? 0}%`,
      icon: 'ExclamationTriangleIcon',
      benchmark: `${sm.highest_anomaly_rate_variant?.benchmark_threshold_pct ?? 15}% threshold`,
    },
    {
      label: 'Conformance Fitness',
      value: `${(sm.conformance_fitness?.value_pct ?? 0).toFixed(1)}%`,
      subValue: 'Overall process conformance',
      trend: (sm.conformance_fitness?.trend || 'neutral') as 'up' | 'down' | 'neutral',
      trendValue: `${sm.conformance_fitness?.change_pct ?? 0}%`,
      icon: 'CheckCircleIcon',
      benchmark: sm.conformance_fitness?.benchmark_label || '85% target',
    },
  ];

  const scatter = (agg.frequency_anomaly_scatter || {}).variants || [];
  const chartData: VariantDataPoint[] = scatter.map((v: any) => ({
    id: `V-${v.variant_id}`,
    name: v.name || `Variant ${v.variant_id}`,
    frequency: v.frequency_pct ?? 0,
    anomalyRate: v.anomaly_rate_pct ?? 0,
    caseCount: v.case_count ?? 0,
  }));

  const listResults = (agg.variants_list || {}).results || [];
  const variants: VariantRow[] = listResults.map((v: any) => ({
    id: `V-${v.variant_id}`,
    variantPath: v.name || `Variant ${v.variant_id}`,
    frequency: v.frequency_pct ?? 0,
    anomalyRate: v.anomaly_rate_pct ?? 0,
    conformanceScore: v.conformance_score ?? 0,
    caseCount: v.case_count ?? 0,
    avgDuration: `${(v.avg_duration_days ?? 0).toFixed(1)} days`,
    activities: v.activity_sequence || [],
  }));

  const sevDist = (agg.anomaly_severity_distribution || {}).severity_distribution || [];
  const severityData: AnomalySeverity[] = sevDist.map((s: any) => ({
    severity: (s.level || '').charAt(0).toUpperCase() + (s.level || '').slice(1),
    count: s.count ?? 0,
    percentage: s.pct ?? 0,
    color: s.color || '#888',
  }));

  return { metrics, chartData, variants, severityData };
}

const VariantAnalysisInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [freqMin, setFreqMin] = useState(0);
  const [freqMax, setFreqMax] = useState(100);
  const [conformanceThreshold, setConformanceThreshold] = useState(0);

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
    if (c?.djangoEventLogId) fetchData(c);
  }, []);

  async function fetchData(c: SubteamContext) {
    setDataLoading(true);
    try {
      // Optionally get anomaly_cases from FastAPI to enrich the aggregate call
      let anomalyCases: any[] = [];
      if (c.fastApiRunId) {
        try {
          const faRes = await fetch(`${FASTAPI}/runs/${c.fastApiRunId}`);
          if (faRes.ok) {
            const faData = await faRes.json();
            anomalyCases = faData.anomaly_cases || [];
          }
        } catch { /* proceed without anomaly enrichment */ }
      }

      const body: any = {
        event_log_id: c.djangoEventLogId,
        ...(c.fastApiRunId ? { run_id: c.fastApiRunId } : {}),
        ...(anomalyCases.length ? { anomaly_data: { anomaly_cases: anomalyCases } } : {}),
      };

      const res = await fetch(`${DJANGO}/variants/aggregate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
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
      const newCtx = { ...ctx, fastApiRunId, djangoEventLogId };
      setCtx(newCtx);
      await fetchData(newCtx);
      showToast({ type: 'success', title: 'Dataset uploaded', message: 'Variant analysis complete' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      showToast({ type: 'error', title: 'Upload failed', message: msg });
    } finally {
      setIsUploading(false);
    }
  }

  const handleRefresh = () => {
    if (ctx?.djangoEventLogId) fetchData(ctx);
    else { setIsLoading(true); setTimeout(() => setIsLoading(false), 800); }
  };

  if (!isHydrated) return <DashboardLoadingScreen dashboardName="Variant Analysis Dashboard" isLoading={true} variant="variant" />;

  if (dataLoading) return <DashboardLoadingScreen dashboardName="Variant Analysis Dashboard" isLoading={true} variant="variant" />;

  if (!ctx?.djangoEventLogId || !dashData) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <NavigationSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
          <GlobalHeader onRefresh={handleRefresh} isLoading={isLoading} />
          <div className="p-8 flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-md">
              <p className="text-sm font-medium text-text-secondary mb-1">{ctx?.subteamName || 'Subteam'}</p>
              <h2 className="text-xl font-semibold text-text-primary mb-6">Variant Analysis Dashboard</h2>
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

  const { metrics, chartData, variants, severityData } = dashData!;

  // Apply client-side filters from VariantFilters panel
  const filteredVariants = variants.filter(v =>
    v.frequency >= freqMin &&
    v.frequency <= freqMax &&
    v.conformanceScore >= conformanceThreshold
  );
  const filteredChartData = chartData.filter(v =>
    v.frequency >= freqMin &&
    v.frequency <= freqMax
  );

  const selectedVariantData = filteredVariants.find(v => v.id === selectedVariant);
  const totalCases = selectedVariantData?.caseCount || 0;
  const anomalousCases = totalCases > 0
    ? Math.round(totalCases * ((selectedVariantData?.anomalyRate || 0) / 100))
    : 0;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
      <NavigationSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
        <GlobalHeader onRefresh={handleRefresh} isLoading={isLoading || dataLoading} />
        <div className="p-8">
          <div className="mb-8 flex items-start justify-between opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <div>
              <p className="text-sm text-text-secondary mb-1">{ctx.subteamName}</p>
              <h1 className="font-serif text-3xl font-semibold text-text-primary mb-2">Variant Analysis</h1>
              <p className="font-sans text-base text-text-secondary">Process deviation analysis and conformance tracking</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input ref={fileInputRef} type="file" accept=".csv,.xes,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50">
                {isUploading ? <span className="w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin" /> : <Upload size={15} />}
                Replace
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <VariantOverviewCards metrics={metrics} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <VariantFrequencyChart data={filteredChartData} onVariantClick={setSelectedVariant} />

                {/* Quick Insights — shown directly under the bubble chart */}
                <div className="bg-bg-secondary border border-border-primary rounded-xl p-5">
                  <h3 className="font-serif text-base font-semibold text-text-primary mb-3">Quick Insights</h3>
                  {!selectedVariant ? (
                    <p className="font-sans text-sm text-text-secondary">
                      Click a bubble or a row in the table below to see insights for that variant.
                    </p>
                  ) : (() => {
                    const anomalyRate = totalCases > 0 ? (anomalousCases / totalCases) * 100 : 0;
                    const THRESHOLD = 15;
                    const insights: { bg: string; icon: string; iconCls: string; title: string; body: string }[] = [];

                    if (anomalyRate > THRESHOLD) {
                      insights.push({
                        bg: 'bg-amber-50 dark:bg-amber-900/20',
                        icon: 'ExclamationTriangleIcon',
                        iconCls: 'text-amber-600 dark:text-amber-400',
                        title: 'High Anomaly Concentration',
                        body: `This variant has a ${anomalyRate.toFixed(1)}% anomaly rate, exceeding the ${THRESHOLD}% threshold.`,
                      });
                    } else {
                      insights.push({
                        bg: 'bg-blue-50 dark:bg-blue-900/20',
                        icon: 'ChartBarIcon',
                        iconCls: 'text-nobel-gold',
                        title: 'Process Optimization Opportunity',
                        body: `Anomaly rate is ${anomalyRate.toFixed(1)}% — within the ${THRESHOLD}% threshold. Consider reviewing for further efficiency improvements.`,
                      });
                    }

                    if (totalCases === 0) {
                      insights.length = 0;
                      insights.push({
                        bg: 'bg-bg-primary/50',
                        icon: 'InformationCircleIcon',
                        iconCls: 'text-text-secondary',
                        title: 'No Case Data',
                        body: 'No cases are linked to this variant yet.',
                      });
                    }

                    return (
                      <div className="space-y-2">
                        {insights.map((ins, i) => (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${ins.bg}`}>
                            <Icon name={ins.icon as any} size={18} className={`${ins.iconCls} flex-shrink-0 mt-0.5`} />
                            <div>
                              <p className="font-sans text-sm font-medium text-text-primary mb-0.5">{ins.title}</p>
                              <p className="font-sans text-xs text-text-secondary">{ins.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <VariantComparisonTable variants={filteredVariants} onVariantSelect={setSelectedVariant} />
              </div>
              <div className="space-y-6">
                <VariantFilters
                  onFrequencyFilterChange={(min, max) => { setFreqMin(min); setFreqMax(max); setSelectedVariant(null); }}
                  onConformanceThresholdChange={(t) => { setConformanceThreshold(t); setSelectedVariant(null); }}
                  onDateRangeChange={() => {}}
                />
                <VariantAnomalyBreakdown
                  selectedVariant={selectedVariant}
                  severityData={severityData}
                  totalCases={totalCases}
                  anomalousCases={anomalousCases}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      {(isLoading || dataLoading) && <LoadingStateManager isLoading={true} type="inline" />}
    </div>
  );
};

export default VariantAnalysisInteractive;
