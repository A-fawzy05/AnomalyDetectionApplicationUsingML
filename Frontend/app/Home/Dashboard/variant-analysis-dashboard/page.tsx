import type { Metadata } from 'next';
import VariantAnalysisInteractive from './Components/VariantAnalysisInteractive';
import { ToastProvider } from '@/components/UI/Toast';

export const metadata: Metadata = {
  title: 'Variant Analysis Dashboard - P2P Mining',
  description: 'Process deviation analysis and conformance tracking for P2P workflows, enabling data-driven optimization through comprehensive variant comparison and anomaly rate analysis.',
};

export default function VariantAnalysisDashboardPage() {
  return (
    <ToastProvider>
      <VariantAnalysisInteractive />
    </ToastProvider>
  );
}