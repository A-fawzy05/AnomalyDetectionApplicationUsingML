import Icon from '../../../components/UI/AppIcon';

interface ProcessNode {
  id: string;
  label: string;
  anomalyCount: number;
  totalCases: number;
}

interface ProcessMapVisualizationProps {
  nodes: ProcessNode[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ProcessMapVisualization = ({
  nodes,
  isExpanded,
  onToggleExpand
}: ProcessMapVisualizationProps) => {
  const getNodeColor = (anomalyRate: number) => {
    if (anomalyRate >= 0.3) return 'bg-error/20 border-error';
    if (anomalyRate >= 0.15) return 'bg-warning/20 border-warning';
    return 'bg-success/20 border-success';
  };

  return (
    <div className="bg-card border border-border/30 rounded-md">
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Process Flow Map
        </h3>
        <button
          onClick={onToggleExpand}
          className="p-2 rounded-md hover:bg-muted transition-smooth"
          aria-label={isExpanded ? 'Collapse map' : 'Expand map'}
        >
          <Icon
            name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
            size={20}
            className="text-muted-foreground"
          />
        </button>
      </div>

      {isExpanded && (
        <div className="p-6">
          <div className="space-y-4">
            {nodes.map((node, index) => {
              const anomalyRate = node.anomalyCount / node.totalCases;
              const nodeColor = getNodeColor(anomalyRate);

              return (
                <div key={node.id}>
                  <div className={`border-2 ${nodeColor} rounded-md p-4 transition-smooth hover:shadow-md`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-caption text-sm font-medium text-foreground">
                        {node.label}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {node.totalCases} cases
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-error"
                          style={{ width: `${anomalyRate * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-medium text-error">
                        {node.anomalyCount} anomalies
                      </span>
                    </div>
                  </div>

                  {index < nodes.length - 1 && (
                    <div className="flex justify-center py-2">
                      <Icon name="ChevronDownIcon" size={20} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessMapVisualization;