import type { Metadata } from 'next';
import { ToastProvider } from '@/components/UI/Toast';
import ReportGenerator from './components/ReportGenerator';

export const metadata: Metadata = {
  title: 'Generate Report - P2P Mining',
  description: 'AI-generated procurement analysis report powered by DeepSeek.',
};

export default function GenerateReportPage() {
  return (
    <ToastProvider>
      <ReportGenerator />
    </ToastProvider>
  );
}
