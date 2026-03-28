import Icon from '@/components/UI/AppIcon';

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
    if (anomalyRate >= 0.3) return 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-500';
    if (anomalyRate >= 0.15) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-500';
    return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-500';
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border-primary">
        <h3 className="font-serif text-base font-semibold text-text-primary">
          Process Flow Map
        </h3>
        <button
          onClick={onToggleExpand}
          className="p-2 rounded-lg hover:bg-bg-primary transition-colors"
          aria-label={isExpanded ? 'Collapse map' : 'Expand map'}
        >
          <Icon
            name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
            size={20}
            className="text-text-secondary"
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
                <div
                  key={node.id}
                  className="opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'forwards' }}
                >
                  <div className={`border-2 ${nodeColor} rounded-xl p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-sans text-sm font-medium text-text-primary">
                        {node.label}
                      </span>
                      <span className="font-mono text-xs text-text-secondary">
                        {node.totalCases} cases
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-700"
                          style={{ width: `${anomalyRate * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-medium text-red-600 dark:text-red-400">
                        {node.anomalyCount} anomalies
                      </span>
                    </div>
                  </div>

                  {index < nodes.length - 1 && (
                    <div className="flex justify-center py-2">
                      <Icon name="ChevronDownIcon" size={20} className="text-text-secondary" />
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