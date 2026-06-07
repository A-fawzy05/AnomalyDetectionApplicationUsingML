'use client';

import { useState, useEffect, useRef } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import GlobalHeader from '@/components/common/GlobalHeader';
import { readSubteamContext, SubteamContext } from '@/services/team.service';
import teamService from '@/services/team.service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/UI/Toast';
import { Loader2, Send, RefreshCw, AlertCircle } from 'lucide-react';

const FASTAPI = 'http://localhost:8001/api/v1';

type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

interface AdminTelegram {
  hasTelegram: boolean;
  chatId: string | null;
  adminName: string;
}

const ReportGenerator = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [ctx, setCtx] = useState<SubteamContext | null>(null);

  const [minSeverity, setMinSeverity] = useState<Severity>('Low');
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [adminTelegram, setAdminTelegram] = useState<AdminTelegram | null>(null);
  const [adminTelegramLoading, setAdminTelegramLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const reportRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setIsHydrated(true);
    const c = readSubteamContext();
    setCtx(c);
    if (c?.teamId) {
      teamService.getAdminTelegram(c.teamId)
        .then(res => setAdminTelegram(res.data))
        .catch(() => setAdminTelegram({ hasTelegram: false, chatId: null, adminName: 'Admin' }))
        .finally(() => setAdminTelegramLoading(false));
    } else {
      setAdminTelegramLoading(false);
    }
  }, []);

  async function handleGenerate() {
    if (!ctx?.fastApiRunId) return;
    setIsGenerating(true);
    setGenerateError(null);
    setReport(null);
    try {
      const res = await fetch(`${FASTAPI}/runs/${ctx.fastApiRunId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: user?.fullName || 'Analyst', min_severity: minSeverity }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setReport(data.report_markdown);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Report generation failed';
      setGenerateError(msg);
      addToast({ type: 'error', title: 'Report failed', message: msg });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSendTelegram() {
    if (!ctx?.teamId || !report) return;
    setIsSending(true);
    try {
      await teamService.sendTelegramReport(ctx.teamId, {
        reportMarkdown: report,
        teamName: ctx.teamName,
        subteamName: ctx.subteamName,
        senderName: user?.fullName || 'A team member',
      });
      addToast({ type: 'success', title: 'Sent', message: `Report sent to ${adminTelegram?.adminName} on Telegram` });
    } catch (err) {
      addToast({ type: 'error', title: 'Send failed', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsSending(false);
    }
  }

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <NavigationSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(v => !v)} />
      <main className={`transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-60'}`}>
        <GlobalHeader isLoading={isGenerating} />
        <div className="p-8">

          {}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-sm text-text-secondary mb-1">{ctx?.subteamName || 'Subteam'}</p>
              <h1 className="text-xl font-semibold text-text-primary">Generate Report</h1>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={minSeverity}
                onChange={e => setMinSeverity(e.target.value as Severity)}
                disabled={isGenerating}
                className="pl-3 pr-8 py-2 text-sm rounded-md border border-border-primary bg-bg-secondary text-text-primary outline-none focus:border-nobel-gold disabled:opacity-50 transition-colors"
              >
                <option value="Low">All severities</option>
                <option value="Medium">Medium+</option>
                <option value="High">High+</option>
                <option value="Critical">Critical only</option>
              </select>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !ctx?.fastApiRunId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-nobel-gold text-bg-primary hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating
                  ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                  : <><RefreshCw size={15} /> Generate Report</>
                }
              </button>
            </div>
          </div>

          {}
          {!ctx?.fastApiRunId && (
            <div className="flex items-center gap-2 text-sm text-text-secondary border border-border-primary rounded-md px-4 py-3 bg-bg-secondary">
              <AlertCircle size={15} />
              Upload a dataset first in the Anomaly Detection dashboard.
            </div>
          )}

          {}
          {isGenerating && (
            <div className="flex items-center gap-3 text-sm text-text-secondary py-12 justify-center">
              <Loader2 size={18} className="animate-spin" />
              Generating AI report via DeepSeek — this may take up to 60 seconds…
            </div>
          )}

          {}
          {generateError && !isGenerating && (
            <div className="flex items-start gap-2 text-sm text-red-400 border border-red-500/20 bg-red-500/5 rounded-md px-4 py-3">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              {generateError}
            </div>
          )}

          {}
          {report && !isGenerating && (
            <div className="flex flex-col gap-3">
              {}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">{report.length.toLocaleString()} characters</span>
                <div className="flex items-center gap-2">
                  {}
                  {!adminTelegramLoading && adminTelegram?.hasTelegram === false ? (
                    <span className="text-xs text-text-secondary">Admin has no Telegram linked</span>
                  ) : (
                    <button
                      onClick={handleSendTelegram}
                      disabled={isSending || adminTelegramLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50 transition-colors"
                    >
                      {isSending
                        ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                        : <><Send size={14} /> Send to {adminTelegram?.adminName || 'Admin'}</>
                      }
                    </button>
                  )}
                  <button
                    onClick={handleGenerate}
                    className="text-xs text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              {}
              <pre
                ref={reportRef}
                className="bg-bg-secondary border border-border-primary rounded-md p-5 text-sm font-mono text-text-primary overflow-auto max-h-[65vh] whitespace-pre-wrap leading-relaxed"
              >
                {report}
              </pre>
            </div>
          )}

          {}
          {!report && !isGenerating && !generateError && ctx?.fastApiRunId && (
            <div className="text-sm text-text-secondary text-center py-16">
              Select a severity filter and click Generate Report.
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ReportGenerator;
