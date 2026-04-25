import type { Metadata } from 'next';
import PerformanceAnalysisInteractive from './components/PerformanceAnalysisInteractive';
import { ToastProvider } from '@/components/UI/Toast';

export const metadata: Metadata = {
  title: 'Performance Analysis Dashboard - P2P Mining',
  description: 'Identify workflow bottlenecks and optimize Purchase-to-Pay cycle times through comprehensive performance metrics visualization and analytics.',
};

export default function PerformanceAnalysisDashboardPage() {
  return (
    <ToastProvider>
      <PerformanceAnalysisInteractive />
    </ToastProvider>
  );
}