'use client';

import { useState, useEffect, useRef } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import GlobalHeader from '@/components/common/GlobalHeader';
import LoadingStateManager from '@/components/common/LoadingStateManager';
import DashboardLoadingScreen from '@/components/common/DashboardLoadingScreen';
import KPIMetricCard from './KPIMetricCard';
import AnomalyTableRow from './anomalyTableRow';
import RealTimeAnomalyFeed from './RealTimeAnomalyFeed';
import ProcessMapVisualization from './ProcessMapVisualization';
import FilterPanel from './FilterPanel';
import LiveTelemetryPanel from './LiveTelemetryPanel';
import Icon from '@/components/UI/AppIcon';
import { useToast } from '@/components/UI/Toast';
import { readSubteamContext, updateSubteamContextIds, SubteamContext } from '@/services/team.service';
import { Upload, RefreshCw, PlusCircle, Activity } from 'lucide-react';

interface KPIData {
  totalCases: number; anomalousCases: number; anomalyRate: number; avgProcessingTime: string;
  trends: { totalCases: number; anomalousCases: number; anomalyRate: number; avgProcessingTime: number };
  sparklines: { totalCases: number[]; anomalousCases: number[]; anomalyRate: number[]; avgProcessingTime: number[] };
}
interface AnomalyCase {
  id: string; caseId: string; supplier: string; amount: string; anomalyType: string;
  severityScore: number; severityLabel: string;
  status: 'open' | 'investigating' | 'resolved' | 'false-positive'; timestamp: string;
}
interface AnomalyFeedItem {
  id: string; caseId: string; supplier: string; anomalyType: string;
  severity: 'critical' | 'high' | 'medium' | 'low'; timestamp: string; amount: string;
}
interface ProcessNode { id: string; label: string; anomalyCount: number; totalCases: number; }
interface FilterOption { id: string; label: string; count: number; }

const FASTAPI = 'http://localhost:8001/api/v1';
const NODEJS  = 'http://localhost:3001/api/teams';

// Derive severity from score — never trust the API string which can be inconsistent
function scoreToSeverity(score: number): 'Critical' | 'High' | 'Medium' | 'Low' {
  if (score >= 0.9) return 'Critical';
  if (score >= 0.6) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
}

const SEVERITY_ORDER: Array<'Critical' | 'High' | 'Medium' | 'Low'> = ['Critical', 'High', 'Medium', 'Low'];

function mapRunToState(data: any) {
  const s = data.summary || {};
  const kpiData: KPIData = {
    totalCases: s.total_cases ?? 0,
    anomalousCases: s.anomalous_cases ?? 0,
    anomalyRate: +((s.anomaly_rate ?? 0) * 100).toFixed(2),
    avgProcessingTime: `${(s.avg_processing_time_days ?? 0).toFixed(1)} days`,
    trends: {
      totalCases: +((s.delta_total_cases_pct ?? 0) * 100).toFixed(1),
      anomalousCases: +((s.delta_anomalous_cases_pct ?? 0) * 100).toFixed(1),
      anomalyRate: +((s.delta_anomaly_rate_pct ?? 0) * 100).toFixed(1),
      avgProcessingTime: +((s.delta_avg_processing_time_pct ?? 0) * 100).toFixed(1),
    },
    sparklines: {
      totalCases: [s.total_cases ?? 0],
      anomalousCases: [s.anomalous_cases ?? 0],
      anomalyRate: [(s.anomaly_rate ?? 0) * 100],
      avgProcessingTime: [s.avg_processing_time_days ?? 0],
    },
  };

  const anomalyCases: AnomalyCase[] = (data.anomaly_cases || []).map((c: any, i: number) => ({
    id: String(i),
    caseId: c.case_id || `case-${i}`,
    supplier: c.supplier || 'Unknown',
    amount: `$${(c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    anomalyType: c.anomaly_type || 'Unknown',
    severityScore: c.severity_score ?? 0,
    severityLabel: scoreToSeverity(c.severity_score ?? 0),
    status: (() => {
      const raw = (c.status || 'open').toLowerCase().replace(/\s+/g, '-');
      if (['open', 'investigating', 'resolved', 'false-positive'].includes(raw)) return raw as AnomalyCase['status'];
      return 'open';
    })(),
    timestamp: c.detected_at ? new Date(c.detected_at).toLocaleDateString() : '—',
  }));

  const feedItems: AnomalyFeedItem[] = (data.real_time_feed || []).map((f: any, i: number) => ({
    id: String(i),
    caseId: f.case_id || `case-${i}`,
    supplier: f.supplier || 'Unknown',
    anomalyType: f.anomaly_type || 'Unknown',
    severity: scoreToSeverity(f.severity_score ?? 0).toLowerCase() as AnomalyFeedItem['severity'],
    timestamp: f.detected_at ? new Date(f.detected_at).toLocaleTimeString() : '—',
    amount: `$${(f.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  }));

  const processNodes: ProcessNode[] = (data.process_flow_map || []).map((p: any, i: number) => ({
    id: String(i + 1), label: p.phase || `Phase ${i + 1}`,
    anomalyCount: p.anomalies ?? 0, totalCases: p.total_cases ?? 0,
  }));

  // Build filter options from mapped anomalyCases (so IDs always match severityLabel)
  const typeCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const supplierCounts: Record<string, number> = {};
  anomalyCases.forEach(c => {
    typeCounts[c.anomalyType] = (typeCounts[c.anomalyType] || 0) + 1;
    severityCounts[c.severityLabel] = (severityCounts[c.severityLabel] || 0) + 1;
    supplierCounts[c.supplier] = (supplierCounts[c.supplier] || 0) + 1;
  });

  const anomalyTypeOptions: FilterOption[] = Object.entries(typeCounts).map(([label, count]) => ({ id: label, label, count }));
  // Fixed order: Critical → High → Medium → Low, exclude zeros
  const severityLevelOptions: FilterOption[] = SEVERITY_ORDER
    .filter(s => severityCounts[s] > 0)
    .map(s => ({ id: s, label: s, count: severityCounts[s] }));
  const supplierOptions: FilterOption[] = Object.entries(supplierCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ id: label, label, count }));

  return { kpiData, anomalyCases, feedItems, processNodes, anomalyTypeOptions, severityLevelOptions, supplierOptions };
}

const AnomalyDetectionInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessMapExpanded, setIsProcessMapExpanded] = useState(true);
  const [selectedAnomalyTypes, setSelectedAnomalyTypes] = useState<string[]>([]);
  const [selectedSeverityLevels, setSelectedSeverityLevels] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState('last-7-days');
  const [isLive, setIsLive] = useState(false);

  const [ctx, setCtx] = useState<SubteamContext | null>(null);
  const [dashData, setDashData] = useState<ReturnType<typeof mapRunToState> | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAppending, setIsAppending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const PAGE_SIZE = 5;

  useEffect(() => {
    setIsHydrated(true);
    const c = readSubteamContext();
    setCtx(c);
    if (c?.fastApiRunId) fetchData(c.fastApiRunId);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [selectedAnomalyTypes, selectedSeverityLevels, selectedSuppliers]);

  useEffect(() => {
    if (ctx?.fastApiRunId && isHydrated) {
      handleRefresh();
    }
  }, [dateRange]);

  async function fetchData(runId: string, isReplace = false, silent = false) {
    // Silent refresh (used by append while Live) skips the full-page loader so
    // the Live Telemetry panel stays mounted and ramps to the new real value.
    if (!silent) setDataLoading(true);
    try {
      const res = await fetch(`${FASTAPI}/runs/${runId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const mapped = mapRunToState(json);
      setDashData(mapped);
      setCurrentPage(1);

      // Fire real notifications
      if (isReplace) {
        showToast({ type: 'success', title: 'Dashboard updated', message: 'Dataset replaced — analysis refreshed' });
      }
      const criticalCount = mapped.anomalyCases.filter(c => c.severityLabel === 'Critical').length;
      if (criticalCount > 0) {
        showToast({ type: 'error', title: `${criticalCount} critical anomal${criticalCount > 1 ? 'ies' : 'y'} detected`, message: 'Review the anomaly table below' });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to load data', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      if (!silent) setDataLoading(false);
    }
  }

  async function handleUpload(file: File) {
    if (!ctx) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      // 1. FastAPI
      const faForm = new FormData();
      faForm.append('file', file);
      const faRes = await fetch(`${FASTAPI}/analyze`, { method: 'POST', body: faForm });
      if (!faRes.ok) throw new Error(`FastAPI error: ${(await faRes.json()).detail || faRes.status}`);
      const faData = await faRes.json();
      const fastApiRunId: string = faData.run_id;

      // 2. Django
      const djForm = new FormData();
      djForm.append('file', file);
      djForm.append('name', `${ctx.subteamName} — ${file.name}`);
      const djRes = await fetch('http://localhost:8000/api/v1/event-logs/upload/', { method: 'POST', body: djForm });
      if (!djRes.ok) throw new Error(`Django error: ${(await djRes.json()).message || djRes.status}`);
      const djData = await djRes.json();
      const djangoEventLogId: string = djData.id;

      // 3. Save to subteam
      await fetch(`${NODEJS}/${ctx.teamId}/subteams/${ctx.subteamId}/data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ fastApiRunId, djangoEventLogId }),
      });

      // 4. Update localStorage + state
      updateSubteamContextIds(fastApiRunId, djangoEventLogId);
      setCtx(prev => prev ? { ...prev, fastApiRunId, djangoEventLogId } : prev);
      await fetchData(fastApiRunId, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      showToast({ type: 'error', title: 'Upload failed', message: msg });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAppend(file: File) {
    if (!ctx?.fastApiRunId) return;
    setIsAppending(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${FASTAPI}/runs/${ctx.fastApiRunId}/append/file`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Silent refresh while Live keeps the telemetry chart mounted so it ramps
      // smoothly to the new real values instead of blanking on a loading screen.
      await fetchData(ctx.fastApiRunId, false, isLive);
      showToast({ type: 'success', title: 'Data appended', message: 'Dashboard refreshed' });
    } catch (err) {
      showToast({ type: 'error', title: 'Append failed', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsAppending(false);
    }
  }

  const handleRefresh = () => {
    if (ctx?.fastApiRunId) fetchData(ctx.fastApiRunId);
    else { setIsLoading(true); setTimeout(() => setIsLoading(false), 800); }
  };

  const handleClearFilters = () => {
    setSelectedAnomalyTypes([]);
    setSelectedSeverityLevels([]);
    setSelectedSuppliers([]);
    setCurrentPage(1);
  };
  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('desc'); }
  };

  if (!isHydrated) return <DashboardLoadingScreen dashboardName="Anomaly Detection Dashboard" isLoading={true} variant="anomaly" />;

  // ── Data loading ─────────────────────────────────────────────────────────
  if (dataLoading) return <DashboardLoadingScreen dashboardName="Anomaly Detection Dashboard" isLoading={true} variant="anomaly" />;

  // ── Upload panel (no run ID, or fetch failed) ─────────────────────────────
  if (!ctx?.fastApiRunId || !dashData) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <NavigationSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
          <GlobalHeader onRefresh={handleRefresh} isLoading={isLoading} dateRange={dateRange} onDateRangeChange={setDateRange} />
          <div className="p-8 flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-md">
              <p className="text-sm font-medium text-text-secondary mb-1">{ctx?.subteamName || 'Subteam'}</p>
              <h2 className="text-xl font-semibold text-text-primary mb-6">Anomaly Detection Dashboard</h2>
              <div className="bg-bg-secondary border border-border-primary rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Upload size={20} className="text-text-secondary" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-text-primary">Upload a dataset to begin</p>
                </div>
                <p className="text-xs text-text-secondary mb-5">Accepts CSV, XES, or OCEL2 JSON event log files.</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xes,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !ctx}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium bg-nobel-gold text-bg-primary hover:bg-yellow-500 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? <><span className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" /> Uploading…</> : <><Upload size={15} /> Choose File</>}
                </button>
                {!ctx && <p className="mt-3 text-xs text-red-400">No subteam selected. Go back to the profile page and select a subteam.</p>}
                {uploadError && <p className="mt-3 text-xs text-red-400">{uploadError}</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { kpiData, anomalyCases, feedItems, processNodes, anomalyTypeOptions, severityLevelOptions, supplierOptions } = dashData!;

  const filteredCases = anomalyCases.filter(c => {
    if (selectedAnomalyTypes.length && !selectedAnomalyTypes.includes(c.anomalyType)) return false;
    if (selectedSeverityLevels.length && !selectedSeverityLevels.includes(c.severityLabel)) return false;
    if (selectedSuppliers.length && !selectedSuppliers.includes(c.supplier)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const paginatedCases = filteredCases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
      <NavigationSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main className={`transition-all duration-base ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
        <GlobalHeader onRefresh={handleRefresh} isLoading={isLoading || dataLoading} dateRange={dateRange} onDateRangeChange={setDateRange} />
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <div>
              <p className="text-sm text-text-secondary mb-1">{ctx.subteamName}</p>
              <h1 className="font-serif text-3xl font-bold text-text-primary mb-1">Anomaly Detection</h1>
              <p className="font-sans text-base text-text-secondary">Real-time monitoring for procurement irregularities</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {/* Live toggle */}
              <button
                onClick={() => setIsLive(v => !v)}
                title={isLive ? 'Stop live telemetry' : 'Start live telemetry'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors ${
                  isLive
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                {isLive
                  ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  : <Activity size={15} />}
                {isLive ? 'Live' : 'Go Live'}
              </button>
              {/* Append button */}
              <input ref={appendInputRef} type="file" accept=".csv,.xes,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAppend(f); e.target.value = ''; }} />
              <button onClick={() => appendInputRef.current?.click()} disabled={isAppending} title="Append data to this run" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50">
                {isAppending ? <span className="w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin" /> : <PlusCircle size={15} />}
                Append
              </button>
              {/* Re-upload */}
              <input ref={fileInputRef} type="file" accept=".csv,.xes,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} title="Replace dataset" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50">
                {isUploading ? <span className="w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin" /> : <Upload size={15} />}
                Replace
              </button>
            </div>
          </div>

          {/* Live Telemetry Panel */}
          <LiveTelemetryPanel isLive={isLive} anomalyRate={kpiData.anomalyRate} anomalousCases={kpiData.anomalousCases} />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPIMetricCard title="Total Cases" value={kpiData.totalCases.toLocaleString()} trend={kpiData.trends.totalCases} trendLabel="vs last period" icon="DocumentTextIcon" sparklineData={kpiData.sparklines.totalCases} status="neutral" delay={0} isLive={isLive} />
            <KPIMetricCard title="Anomalous Cases" value={kpiData.anomalousCases.toLocaleString()} trend={kpiData.trends.anomalousCases} trendLabel="vs last period" icon="ExclamationTriangleIcon" sparklineData={kpiData.sparklines.anomalousCases} status="error" delay={100} isLive={isLive} />
            <KPIMetricCard title="Anomaly Rate" value={`${kpiData.anomalyRate}%`} trend={kpiData.trends.anomalyRate} trendLabel="vs last period" icon="ChartBarIcon" sparklineData={kpiData.sparklines.anomalyRate} status="warning" delay={200} isLive={isLive} />
            <KPIMetricCard title="Avg Processing Time" value={kpiData.avgProcessingTime} trend={kpiData.trends.avgProcessingTime} trendLabel="vs last period" icon="ClockIcon" sparklineData={kpiData.sparklines.avgProcessingTime} status="success" delay={300} isLive={isLive} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3">
              <FilterPanel
                anomalyTypes={anomalyTypeOptions} severityLevels={severityLevelOptions} suppliers={supplierOptions}
                selectedAnomalyTypes={selectedAnomalyTypes} selectedSeverityLevels={selectedSeverityLevels} selectedSuppliers={selectedSuppliers}
                onAnomalyTypeChange={setSelectedAnomalyTypes} onSeverityLevelChange={setSelectedSeverityLevels} onSupplierChange={setSelectedSuppliers}
                onClearAll={handleClearFilters}
              />
            </div>
            <div className="lg:col-span-6">
              <div className="bg-bg-secondary border border-border-primary rounded-xl">
                <div className="flex items-center justify-between p-4 border-b border-border-primary">
                  <h3 className="font-serif text-base font-semibold text-text-primary">Anomaly Cases</h3>
                  <span className="font-sans text-sm text-text-secondary">{filteredCases.length} result{filteredCases.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-bg-primary/50 border-b border-border-primary">
                      <tr>
                        {['caseId','supplier','amount','anomalyType','severity','status','timestamp'].map(col => (
                          <th key={col} className="px-4 py-3 text-left">
                            <button onClick={() => handleSort(col)} className="flex items-center gap-2 font-sans text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                              {col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                              <Icon name="ChevronUpDownIcon" size={16} />
                            </button>
                          </th>
                        ))}
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCases.map(c => (
                        <AnomalyTableRow
                          key={c.id}
                          caseId={c.caseId}
                          supplier={c.supplier}
                          amount={c.amount}
                          anomalyType={c.anomalyType}
                          severityScore={c.severityScore}
                          status={c.status}
                          timestamp={c.timestamp}
                          onRowClick={() => {}}
                        />
                      ))}
                      {filteredCases.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-text-secondary">No cases match the current filters</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
                    <span className="text-xs text-text-secondary">
                      {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCases.length)} of {filteredCases.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded text-xs border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === '…' ? (
                            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-text-secondary">…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setCurrentPage(p as number)}
                              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                                currentPage === p
                                  ? 'border-nobel-gold bg-nobel-gold/10 text-nobel-gold'
                                  : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-primary'
                              }`}
                            >
                              {p}
                            </button>
                          )
                        )}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 rounded text-xs border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-3 space-y-6">
              <RealTimeAnomalyFeed items={feedItems} onItemClick={() => {}} />
            </div>
          </div>

          {/* Process Map */}
          <div className="mt-6">
            <ProcessMapVisualization
              nodes={processNodes}
              isExpanded={isProcessMapExpanded}
              onToggleExpand={() => setIsProcessMapExpanded(!isProcessMapExpanded)}
            />
          </div>
        </div>
      </main>
      {(isLoading || dataLoading) && <LoadingStateManager isLoading={true} type="inline" />}
    </div>
  );
};

export default AnomalyDetectionInteractive;
