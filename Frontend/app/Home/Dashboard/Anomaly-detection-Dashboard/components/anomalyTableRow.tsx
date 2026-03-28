

interface AnomalyTableRowProps {
  caseId: string;
  supplier: string;
  amount: string;
  anomalyType: string;
  severityScore: number;
  status: 'open' | 'investigating' | 'resolved' | 'false-positive';
  timestamp: string;
  onRowClick: () => void;
}

const AnomalyTableRow = ({
  caseId,
  supplier,
  amount,
  anomalyType,
  severityScore,
  status,
  timestamp,
  onRowClick
}: AnomalyTableRowProps) => {
  const getSeverityColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 dark:text-red-400';
    if (score >= 0.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const getSeverityBg = (score: number) => {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.5) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', label: 'Open' };
      case 'investigating':
        return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', label: 'Investigating' };
      case 'resolved':
        return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'Resolved' };
      case 'false-positive':
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-text-secondary', label: 'False Positive' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-text-secondary', label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <tr
      onClick={onRowClick}
      className="border-b border-border-primary hover:bg-bg-primary/50 cursor-pointer transition-colors duration-200"
    >
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-text-primary">{caseId}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-sans text-sm text-text-primary">{supplier}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm font-medium text-text-primary">{amount}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-sans text-sm text-text-primary">{anomalyType}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getSeverityBg(severityScore)} rounded-full transition-all duration-700`}
              style={{ width: `${severityScore * 100}%` }}
            />
          </div>
          <span className={`font-mono text-sm font-medium ${getSeverityColor(severityScore)}`}>
            {(severityScore * 100).toFixed(0)}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-lg ${statusConfig.bg} ${statusConfig.text} font-sans text-xs font-medium`}
        >
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-sans text-xs text-text-secondary">{timestamp}</span>
      </td>
    </tr>
  );
};

export default AnomalyTableRow;