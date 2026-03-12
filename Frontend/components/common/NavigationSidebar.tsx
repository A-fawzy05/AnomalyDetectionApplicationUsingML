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
    path: '/anomaly-detection-dashboard',
    label: 'Anomaly Detection',
    icon: 'ExclamationTriangleIcon',
    description: 'Real-time monitoring and immediate response hub for procurement irregularities'
  },
  {
    path: '/performance-analysis-dashboard',
    label: 'Performance Analysis',
    icon: 'ChartBarIcon',
    description: 'Workflow optimization and bottleneck identification for process improvement'
  },
  {
    path: '/variant-analysis-dashboard',
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
          fixed left-0 top-0 h-screen bg-card border-r border-border/30
          transition-all duration-base ease-smooth z-sidebar
          ${isCollapsed ? 'w-20' : 'w-60'}
          lg:fixed
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between h-20 px-md border-b border-border/30">
            <Link href="/" className="flex items-center gap-3 transition-smooth hover:opacity-80">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center glow-accent">
                <svg
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                >
                  <path
                    d="M20 8L28 14V26L20 32L12 26V14L20 8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary-foreground"
                  />
                  <path
                    d="M20 8V20M20 20L28 26M20 20L12 26"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary-foreground"
                  />
                </svg>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-base font-heading font-semibold text-foreground">
                    P2P Mining
                  </span>
                  <span className="text-xs font-caption text-muted-foreground">
                    Dashboard
                  </span>
                </div>
              )}
            </Link>
            
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-md hover:bg-muted transition-smooth lg:flex hidden"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Icon
                  name={isCollapsed ? 'ChevronRightIcon' : 'ChevronLeftIcon'}
                  size={20}
                  className="text-muted-foreground"
                />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-md px-3">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const active = isActive(item.path);
                const hovered = hoveredItem === item.path;

                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`
                        group relative flex items-center gap-3 px-3 py-3 rounded-md
                        transition-all duration-base ease-smooth
                        ${active
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-card-foreground hover:bg-muted hover:text-foreground'
                        }
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon
                        name={item.icon as any}
                        size={24}
                        variant={active ? 'solid' : 'outline'}
                        className={`flex-shrink-0 transition-transform duration-base ${
                          hovered && !active ? 'scale-110' : ''
                        }`}
                      />
                      
                      {!isCollapsed && (
                        <span className="font-caption font-medium text-sm truncate">
                          {item.label}
                        </span>
                      )}

                      {active && !isCollapsed && (
                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div
                          className={`
                            absolute left-full ml-2 px-3 py-2 rounded-md
                            bg-popover text-popover-foreground shadow-lg
                            whitespace-nowrap z-tooltip pointer-events-none
                            transition-opacity duration-fast
                            ${hovered ? 'opacity-100' : 'opacity-0'}
                          `}
                        >
                          <div className="font-caption font-medium text-sm">
                            {item.label}
                          </div>
                          <div className="font-caption text-xs text-muted-foreground mt-1 max-w-xs">
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
          <div className="border-t border-border/30 p-md">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <Icon name="UserIcon" size={18} className="text-accent-foreground" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-caption font-medium text-sm text-foreground truncate">
                    Admin User
                  </div>
                  <div className="font-caption text-xs text-muted-foreground truncate">
                    admin@p2pmining.com
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Spacer for fixed sidebar */}
      <div className={`${isCollapsed ? 'w-20' : 'w-60'} flex-shrink-0 transition-all duration-base`} />
    </>
  );
};

export default NavigationSidebar;