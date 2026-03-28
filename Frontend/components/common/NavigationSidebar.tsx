'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '../UI/AppIcon';

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  description: string;
}

interface NavigationSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navigationItems: NavigationItem[] = [
  {
    path: '/Home/Dashboard/Anomaly-detection-Dashboard',
    label: 'Anomaly Detection',
    icon: 'ExclamationTriangleIcon',
    description: 'Real-time monitoring and immediate response hub for procurement irregularities'
  },
  {
    path: '/Home/Dashboard/Performance-analysis-dashboard',
    label: 'Performance Analysis',
    icon: 'ChartBarIcon',
    description: 'Workflow optimization and bottleneck identification for process improvement'
  },
  {
    path: '/Home/Dashboard/variant-analysis-dashboard',
    label: 'Variant Analysis',
    icon: 'AdjustmentsHorizontalIcon',
    description: 'Process deviation analysis and conformance tracking for audit and optimization'
  }
];

const NavigationSidebar = ({ isCollapsed = false, onToggleCollapse }: NavigationSidebarProps) => {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-bg-secondary border-r border-border-primary
          transition-all duration-300 ease-out z-50
          ${isCollapsed ? 'w-20' : 'w-60'}
          lg:fixed
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-border-primary">
            <Link href="/Home" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="w-10 h-10 rounded-xl bg-nobel-gold flex items-center justify-center shadow-lg shadow-nobel-gold/20 flex-shrink-0">
                <svg
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-white"
                >
                  <path
                    d="M20 8L28 14V26L20 32L12 26V14L20 8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 8V20M20 20L28 26M20 20L12 26"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-base font-serif font-semibold text-text-primary truncate">
                    P2P Mining
                  </span>
                  <span className="text-xs font-sans text-nobel-gold truncate uppercase tracking-wider font-semibold">
                    Dashboard
                  </span>
                </div>
              )}
            </Link>
            
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-lg hover:bg-bg-primary border border-transparent hover:border-border-primary transition-all lg:flex hidden"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Icon
                  name={isCollapsed ? 'ChevronRightIcon' : 'ChevronLeftIcon'}
                  size={16}
                  className="text-text-secondary hover:text-text-primary"
                />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-6 px-4">
            <ul className="space-y-3">
              {navigationItems.map((item) => {
                const active = isActive(item.path);
                const hovered = hoveredItem === item.path;

                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`
                        group relative flex items-center gap-3 px-3 py-3 rounded-xl
                        transition-all duration-300 ease-out border border-transparent
                        ${active
                          ? 'bg-nobel-gold text-white shadow-md shadow-nobel-gold/20'
                          : 'text-text-secondary hover:bg-bg-primary hover:border-border-primary hover:text-text-primary hover:-translate-y-0.5 hover:shadow-sm'
                        }
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon
                        name={item.icon as any}
                        size={22}
                        variant={active ? 'solid' : 'outline'}
                        className={`flex-shrink-0 transition-transform duration-300 ${
                          hovered && !active ? 'scale-110 text-nobel-gold' : ''
                        }`}
                      />
                      
                      {!isCollapsed && (
                        <span className={`font-sans font-medium text-sm truncate transition-colors ${active ? 'text-white' : ''}`}>
                          {item.label}
                        </span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div
                          className={`
                            absolute left-full ml-4 px-4 py-3 rounded-xl
                            bg-bg-secondary border border-border-primary shadow-lg
                            whitespace-nowrap z-50 pointer-events-none
                            transition-all duration-200
                            ${hovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
                          `}
                        >
                          <div className="font-serif font-semibold text-sm text-text-primary mb-1">
                            {item.label}
                          </div>
                          <div className="font-sans text-xs text-text-secondary max-w-xs whitespace-normal line-clamp-2">
                            {item.description}
                          </div>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer Section */}
          <div className="border-t border-border-primary p-6 bg-bg-primary/30">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-nobel-gold/20 flex items-center justify-center flex-shrink-0 border border-nobel-gold/30">
                <Icon name="UserIcon" size={20} className="text-nobel-gold" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-medium text-sm text-text-primary truncate">
                    Admin User
                  </div>
                  <div className="font-sans text-xs text-text-secondary truncate">
                    admin@p2pmining.com
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Spacer for fixed sidebar */}
      <div className={`${isCollapsed ? 'w-20' : 'w-60'} flex-shrink-0 transition-all duration-300 hidden`} />
    </>
  );
};

export default NavigationSidebar;