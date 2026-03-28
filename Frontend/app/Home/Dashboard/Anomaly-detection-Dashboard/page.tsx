import type { Metadata } from 'next';
import AnomalyDetectionInteractive from './components/AnomalyDetectionInteractive';

export const metadata: Metadata = {
  title: 'Anomaly Detection Dashboard - P2P Mining',
  description: 'Real-time monitoring and immediate response hub for procurement irregularities with comprehensive P2P process analytics and anomaly detection capabilities.',
};

export default function AnomalyDetectionDashboardPage() {
  return <AnomalyDetectionInteractive />;
}