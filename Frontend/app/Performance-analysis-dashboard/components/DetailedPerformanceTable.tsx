'use client';

import { useState } from 'react';
import Icon from '../../../components/UI/AppIcon';

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
        return 'bg-success/20 text-success';
      case 'in-progress':
        return 'bg-accent/20 text-accent';
      case 'delayed':
        return 'bg-error/20 text-error';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'delayed':
        return 'Delayed';
      default:
        return status;
    }
  };

  const filteredCases = cases.filter(c => 
    c.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCases = [...filteredCases].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'caseId':
        return multiplier * a.caseId.localeCompare(b.caseId);
      case 'supplier':
        return multiplier * a.supplier.localeCompare(b.supplier);
      case 'cycleTime':
        return multiplier * (a.cycleTime - b.cycleTime);
      case 'activities':
        return multiplier * (a.activities - b.activities);
      case 'bottlenecks':
        return multiplier * (a.bottlenecks - b.bottlenecks);
      default:
        return 0;
    }
  });

  return (
    <div className="bg-card border border-border/30 rounded-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
            Detailed Performance Metrics
          </h3>
          <p className="font-caption text-sm text-muted-foreground">
            Case-level analysis with sorting and filtering
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon 
              name="MagnifyingGlassIcon" 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-md bg-muted border border-border/30 text-foreground font-caption text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth">
            <Icon name="ArrowDownTrayIcon" size={18} />
            <span className="font-caption text-sm font-medium">Export</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('caseId')}
                  className="flex items-center gap-2 font-caption text-sm font-semibold text-muted-foreground hover:text-foreground transition-smooth"
                >
                  Case ID
                  {sortField === 'caseId' && (
                    <Icon 
                      name={sortDirection === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} 
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('supplier')}
                  className="flex items-center gap-2 font-caption text-sm font-semibold text-muted-foreground hover:text-foreground transition-smooth"
                >
                  Supplier
                  {sortField === 'supplier' && (
                    <Icon 
                      name={sortDirection === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} 
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <span className="font-caption text-sm font-semibold text-muted-foreground">
                  Period
                </span>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('cycleTime')}
                  className="flex items-center gap-2 font-caption text-sm font-semibold text-muted-foreground hover:text-foreground transition-smooth"
                >
                  Cycle Time
                  {sortField === 'cycleTime' && (
                    <Icon 
                      name={sortDirection === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} 
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('activities')}
                  className="flex items-center gap-2 font-caption text-sm font-semibold text-muted-foreground hover:text-foreground transition-smooth"
                >
                  Activities
                  {sortField === 'activities' && (
                    <Icon 
                      name={sortDirection === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} 
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('bottlenecks')}
                  className="flex items-center gap-2 font-caption text-sm font-semibold text-muted-foreground hover:text-foreground transition-smooth"
                >
                  Bottlenecks
                  {sortField === 'bottlenecks' && (
                    <Icon 
                      name={sortDirection === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} 
                      size={14}
                    />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <span className="font-caption text-sm font-semibold text-muted-foreground">
                  Status
                </span>
              </th>
              <th className="text-left py-3 px-4">
                <span className="font-caption text-sm font-semibold text-muted-foreground">
                  SLA
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCases.map((caseItem) => (
              <tr
                key={caseItem.caseId}
                onClick={() => onCaseClick(caseItem.caseId)}
                className="border-b border-border/30 hover:bg-muted/50 cursor-pointer transition-smooth"
              >
                <td className="py-3 px-4">
                  <span className="font-caption text-sm font-medium text-primary">
                    {caseItem.caseId}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-caption text-sm text-foreground">
                    {caseItem.supplier}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-caption text-xs text-muted-foreground">
                    <div>{caseItem.startDate}</div>
                    <div>{caseItem.endDate}</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-heading text-sm font-semibold text-foreground">
                    {caseItem.cycleTime} days
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-caption text-sm text-foreground">
                    {caseItem.activities}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {caseItem.bottlenecks > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-error/20 text-error font-caption text-xs font-medium">
                      <Icon name="ExclamationTriangleIcon" size={12} />
                      {caseItem.bottlenecks}
                    </span>
                  ) : (
                    <span className="font-caption text-sm text-muted-foreground">
                      None
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2 py-1 rounded-md font-caption text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                    {getStatusLabel(caseItem.status)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {caseItem.slaCompliance ? (
                    <Icon name="CheckCircleIcon" size={20} className="text-success" />
                  ) : (
                    <Icon name="XCircleIcon" size={20} className="text-error" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-caption text-sm text-muted-foreground">
          Showing {sortedCases.length} of {cases.length} cases
        </span>
      </div>
    </div>
  );
};

export default DetailedPerformanceTable;