'use client';

import { useState } from 'react';
import Icon from '@/components/UI/AppIcon';

interface PerformanceCase {
  caseId: string;
  supplier: string;
  startDate: string;
  endDate: string;
  cycleTime: number;
  activities: number;
  bottlenecks: number;
  status: 'completed' | 'in-progress' | 'delayed';
  slaCompliance: boolean;
}

interface DetailedPerformanceTableProps {
  cases: PerformanceCase[];
  onCaseClick: (caseId: string) => void;
}

type SortField = 'caseId' | 'supplier' | 'cycleTime' | 'activities' | 'bottlenecks';
type SortDirection = 'asc' | 'desc';

const DetailedPerformanceTable = ({ cases, onCaseClick }: DetailedPerformanceTableProps) => {
  const [sortField, setSortField] = useState<SortField>('cycleTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
      case 'in-progress':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'delayed':
        return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-text-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'delayed': return 'Delayed';
      default: return status;
    }
  };

  const filteredCases = cases.filter(c => 
    c.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCases = [...filteredCases].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'caseId': return multiplier * a.caseId.localeCompare(b.caseId);
      case 'supplier': return multiplier * a.supplier.localeCompare(b.supplier);
      case 'cycleTime': return multiplier * (a.cycleTime - b.cycleTime);
      case 'activities': return multiplier * (a.activities - b.activities);
      case 'bottlenecks': return multiplier * (a.bottlenecks - b.bottlenecks);
      default: return 0;
    }
  });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-2 font-sans text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
    >
      {children}
      {sortField === field && (
        <Icon name={sortDirection === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={14} />
      )}
    </button>
  );

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-serif text-lg font-semibold text-text-primary mb-1">
            Detailed Performance Metrics
          </h3>
          <p className="font-sans text-sm text-text-secondary">
            Case-level analysis with sorting and filtering
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon 
              name="MagnifyingGlassIcon" 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg bg-bg-primary border border-border-primary text-text-primary font-sans text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nobel-gold text-white hover:bg-nobel-gold/90 transition-colors">
            <Icon name="ArrowDownTrayIcon" size={18} />
            <span className="font-sans text-sm font-medium">Export</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary">
              <th className="text-left py-3 px-4"><SortButton field="caseId">Case ID</SortButton></th>
              <th className="text-left py-3 px-4"><SortButton field="supplier">Supplier</SortButton></th>
              <th className="text-left py-3 px-4">
                <span className="font-sans text-sm font-semibold text-text-secondary">Period</span>
              </th>
              <th className="text-left py-3 px-4"><SortButton field="cycleTime">Cycle Time</SortButton></th>
              <th className="text-left py-3 px-4"><SortButton field="activities">Activities</SortButton></th>
              <th className="text-left py-3 px-4"><SortButton field="bottlenecks">Bottlenecks</SortButton></th>
              <th className="text-left py-3 px-4">
                <span className="font-sans text-sm font-semibold text-text-secondary">Status</span>
              </th>
              <th className="text-left py-3 px-4">
                <span className="font-sans text-sm font-semibold text-text-secondary">SLA</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCases.map((caseItem) => (
              <tr
                key={caseItem.caseId}
                onClick={() => onCaseClick(caseItem.caseId)}
                className="border-b border-border-primary hover:bg-bg-primary/50 cursor-pointer transition-colors duration-200"
              >
                <td className="py-3 px-4">
                  <span className="font-sans text-sm font-medium text-nobel-gold">{caseItem.caseId}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-sans text-sm text-text-primary">{caseItem.supplier}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-sans text-xs text-text-secondary">
                    <div>{caseItem.startDate}</div>
                    <div>{caseItem.endDate}</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-serif text-sm font-semibold text-text-primary">
                    {caseItem.cycleTime} days
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-sans text-sm text-text-primary">{caseItem.activities}</span>
                </td>
                <td className="py-3 px-4">
                  {caseItem.bottlenecks > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-sans text-xs font-medium">
                      <Icon name="ExclamationTriangleIcon" size={12} />
                      {caseItem.bottlenecks}
                    </span>
                  ) : (
                    <span className="font-sans text-sm text-text-secondary">None</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2.5 py-1 rounded-lg font-sans text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                    {getStatusLabel(caseItem.status)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {caseItem.slaCompliance ? (
                    <Icon name="CheckCircleIcon" size={20} className="text-emerald-500" />
                  ) : (
                    <Icon name="XCircleIcon" size={20} className="text-red-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-sans text-sm text-text-secondary">
          Showing {sortedCases.length} of {cases.length} cases
        </span>
      </div>
    </div>
  );
};

export default DetailedPerformanceTable;