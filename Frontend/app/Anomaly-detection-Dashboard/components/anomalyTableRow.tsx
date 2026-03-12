

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
    if (score >= 0.8) return 'text-error';
    if (score >= 0.5) return 'text-warning';
    return 'text-success';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return { bg: 'bg-error/10', text: 'text-error', label: 'Open' };
      case 'investigating':
        return { bg: 'bg-warning/10', text: 'text-warning', label: 'Investigating' };
      case 'resolved':
        return { bg: 'bg-success/10', text: 'text-success', label: 'Resolved' };
      case 'false-positive':
        return { bg: 'bg-muted', text: 'text-muted-foreground', label: 'False Positive' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <tr
      onClick={onRowClick}
      className="border-b border-border/30 hover:bg-muted/50 cursor-pointer transition-smooth"
    >
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-foreground">{caseId}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-caption text-sm text-foreground">{supplier}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm font-medium text-foreground">{amount}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-caption text-sm text-foreground">{anomalyType}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${getSeverityColor(severityScore)} bg-current`}
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
          className={`inline-flex items-center px-2 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text} font-caption text-xs font-medium`}
        >
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-caption text-xs text-muted-foreground">{timestamp}</span>
      </td>
    </tr>
  );
};

export default AnomalyTableRow;