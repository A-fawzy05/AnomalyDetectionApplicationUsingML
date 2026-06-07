'use client';

import { useEffect, useRef, useState } from 'react';
import { Liveline } from 'liveline';
import type { LivelinePoint } from 'liveline';

interface LiveTelemetryPanelProps {
  isLive: boolean;
  anomalyRate: number;    
  anomalousCases: number; 
}

const TICK_MS = 100;    
const MAX_POINTS = 300; 

const LiveTelemetryPanel = ({ isLive, anomalyRate, anomalousCases }: LiveTelemetryPanelProps) => {
  const [rateData, setRateData] = useState<LivelinePoint[]>([]);
  const [casesData, setCasesData] = useState<LivelinePoint[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const rateRef = useRef(anomalyRate);
  const casesRef = useRef(anomalousCases);
  rateRef.current = anomalyRate;
  casesRef.current = anomalousCases;

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (!isLive) {
      
      setRateData([]);
      setCasesData([]);
      return;
    }

    const t0 = Date.now() / 1000;
    setRateData([{ time: t0, value: rateRef.current }]);
    setCasesData([{ time: t0, value: casesRef.current }]);

    const id = setInterval(() => {
      const t = Date.now() / 1000;

      setRateData(prev => {
        const next = [...prev, { time: t, value: rateRef.current }];
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
      });
      setCasesData(prev => {
        const next = [...prev, { time: t, value: casesRef.current }];
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [isLive]);

  if (!isLive) return null;

  return (
    <div className="mb-8 bg-bg-secondary border border-border-primary rounded-xl opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between p-4 border-b border-border-primary">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-serif text-base font-semibold text-text-primary">Live Telemetry</h3>
        </div>
        <span className="font-sans text-xs text-text-secondary">real-time · updates on data append</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <div>
          <p className="font-sans text-sm text-text-secondary mb-2">Anomaly Rate</p>
          <div className="h-48">
            <Liveline
              data={rateData}
              value={anomalyRate}
              theme={theme}
              color="#f59e0b"
              formatValue={(v: number) => `${v.toFixed(2)}%`}
            />
          </div>
        </div>
        <div>
          <p className="font-sans text-sm text-text-secondary mb-2">Anomalous Cases</p>
          <div className="h-48">
            <Liveline
              data={casesData}
              value={anomalousCases}
              theme={theme}
              color="#ef4444"
              formatValue={(v: number) => Math.round(v).toString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTelemetryPanel;
