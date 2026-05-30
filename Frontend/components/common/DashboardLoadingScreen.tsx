'use client';

type DashboardVariant = 'anomaly' | 'performance' | 'variant';

interface DashboardLoadingScreenProps {
  dashboardName?: string;
  isLoading?: boolean;
  variant?: DashboardVariant;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

const Sk = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-border-primary/40 ${className}`} />
);

const KPICardSk = () => (
  <div className="bg-bg-secondary border border-border-primary rounded-xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <Sk className="w-24 h-3" />
      <Sk className="w-8 h-8 rounded-lg" />
    </div>
    <Sk className="w-28 h-7" />
    <div className="flex items-center gap-2">
      <Sk className="w-4 h-4 rounded-full" />
      <Sk className="w-20 h-3" />
    </div>
    <Sk className="w-full h-8 rounded-lg" />
  </div>
);

const SidebarSk = () => (
  <div className="fixed top-0 left-0 h-full w-60 bg-bg-secondary border-r border-border-primary flex flex-col p-4 gap-3 z-20">
    <div className="flex items-center gap-3 px-2 mb-4">
      <Sk className="w-8 h-8 rounded-lg" />
      <Sk className="w-28 h-4" />
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-2 py-2">
        <Sk className="w-5 h-5 rounded" />
        <Sk className="w-32 h-3" />
      </div>
    ))}
    <div className="mt-auto flex items-center gap-3 px-2 py-2">
      <Sk className="w-8 h-8 rounded-full" />
      <div className="space-y-1.5">
        <Sk className="w-24 h-3" />
        <Sk className="w-16 h-2" />
      </div>
    </div>
  </div>
);

const HeaderSk = () => (
  <div className="h-16 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-6">
    <div className="flex items-center gap-4">
      <Sk className="w-32 h-4" />
    </div>
    <div className="flex items-center gap-3">
      <Sk className="w-28 h-8 rounded-lg" />
      <Sk className="w-8 h-8 rounded-full" />
      <Sk className="w-8 h-8 rounded-full" />
    </div>
  </div>
);

const TableBodySk = ({ rows = 7, cols = 7 }: { rows?: number; cols?: number }) => (
  <>
    <div className="flex gap-3 px-4 py-3 border-b border-border-primary">
      {Array.from({ length: cols }).map((_, i) => (
        <Sk key={i} className="h-3 rounded" style={{ flex: 1 }} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3 px-4 py-3 border-b border-border-primary/40">
        {Array.from({ length: cols }).map((__, j) => (
          <Sk key={j} className="h-3 rounded" style={{ flex: 1 }} />
        ))}
      </div>
    ))}
  </>
);

// ─── Anomaly Skeleton ─────────────────────────────────────────────────────────

const AnomalySkeleton = () => (
  <div className="p-8">
    <div className="mb-8 space-y-2">
      <Sk className="w-72 h-8 rounded-lg" />
      <Sk className="w-96 h-4" />
    </div>

    {/* 4 KPI cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, i) => <KPICardSk key={i} />)}
    </div>

    {/* Main 12-col grid */}
    <div className="grid grid-cols-12 gap-6">
      {/* Filter panel – 3 cols */}
      <div className="col-span-3 bg-bg-secondary border border-border-primary rounded-xl p-4 space-y-3">
        <Sk className="w-20 h-4 rounded mb-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Sk className="w-4 h-4 rounded" />
            <Sk className="h-3 rounded" style={{ flex: 1 }} />
          </div>
        ))}
        <div className="pt-3 border-t border-border-primary space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Sk className="w-4 h-4 rounded" />
              <Sk className="h-3 rounded" style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly table – 6 cols */}
      <div className="col-span-6 bg-bg-secondary border border-border-primary rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <Sk className="w-28 h-4" />
          <Sk className="w-16 h-3" />
        </div>
        <TableBodySk rows={8} cols={7} />
        <div className="flex items-center justify-between p-4 border-t border-border-primary">
          <Sk className="w-32 h-3" />
          <div className="flex gap-2">
            <Sk className="w-20 h-8 rounded-lg" />
            <Sk className="w-16 h-8 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Right column – 3 cols */}
      <div className="col-span-3 space-y-6">
        {/* Feed */}
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-4 space-y-3">
          <Sk className="w-32 h-4 mb-2" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-2 border-b border-border-primary/40">
              <Sk className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Sk className="w-full h-3" />
                <Sk className="w-3/4 h-3" />
              </div>
            </div>
          ))}
        </div>
        {/* Process map */}
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-4 space-y-3">
          <Sk className="w-32 h-4 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Sk key={i} className="w-full h-9 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Performance Skeleton ─────────────────────────────────────────────────────

const PerformanceSkeleton = () => (
  <div className="p-8">
    <div className="mb-8 flex items-start justify-between">
      <div className="space-y-2">
        <Sk className="w-80 h-8 rounded-lg" />
        <Sk className="w-96 h-4" />
      </div>
      <div className="flex gap-3">
        <Sk className="w-36 h-9 rounded-lg" />
        <Sk className="w-32 h-9 rounded-lg" />
      </div>
    </div>

    {/* 6 KPI cards – 3 cols */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {Array.from({ length: 6 }).map((_, i) => <KPICardSk key={i} />)}
    </div>

    {/* Chart + Rankings */}
    <div className="grid grid-cols-12 gap-6 mb-8">
      <div className="col-span-8 bg-bg-secondary border border-border-primary rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <Sk className="w-40 h-4" />
          <Sk className="w-24 h-7 rounded-lg" />
        </div>
        <Sk className="w-full h-56 rounded-xl" />
      </div>
      <div className="col-span-4 bg-bg-secondary border border-border-primary rounded-xl p-5 space-y-4">
        <Sk className="w-40 h-4 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Sk className="w-32 h-3" />
              <Sk className="w-12 h-3" />
            </div>
            <Sk className="w-full h-2 rounded-full" />
          </div>
        ))}
      </div>
    </div>

    {/* Process flow diagram */}
    <div className="mb-8 bg-bg-secondary border border-border-primary rounded-xl p-5">
      <Sk className="w-40 h-4 mb-5" />
      <div className="flex items-center gap-3 overflow-x-hidden py-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <Sk className="w-28 h-16 rounded-xl" />
            {i < 7 && <Sk className="w-8 h-2 rounded" />}
          </div>
        ))}
      </div>
    </div>

    {/* Table */}
    <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border-primary">
        <Sk className="w-48 h-4" />
      </div>
      <TableBodySk rows={6} cols={7} />
    </div>
  </div>
);

// ─── Variant Skeleton ─────────────────────────────────────────────────────────

const VariantSkeleton = () => (
  <div className="p-8">
    <div className="mb-8 space-y-2">
      <Sk className="w-72 h-8 rounded-lg" />
      <Sk className="w-80 h-4" />
    </div>

    <div className="space-y-6">
      {/* 4 overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <KPICardSk key={i} />)}
      </div>

      {/* Main 3-col grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left 2/3: chart + table */}
        <div className="col-span-2 space-y-6">
          <div className="bg-bg-secondary border border-border-primary rounded-xl p-5">
            <Sk className="w-40 h-4 mb-5" />
            <Sk className="w-full h-52 rounded-xl" />
          </div>
          <div className="bg-bg-secondary border border-border-primary rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border-primary">
              <Sk className="w-44 h-4" />
            </div>
            <TableBodySk rows={6} cols={6} />
          </div>
        </div>

        {/* Right 1/3: filters + breakdown */}
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-border-primary rounded-xl p-5 space-y-4">
            <Sk className="w-24 h-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Sk className="w-24 h-3" />
                <Sk className="w-full h-4 rounded-full" />
              </div>
            ))}
          </div>
          <div className="bg-bg-secondary border border-border-primary rounded-xl p-5 space-y-4">
            <Sk className="w-36 h-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Sk className="w-3 h-3 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between">
                    <Sk className="w-20 h-3" />
                    <Sk className="w-8 h-3" />
                  </div>
                  <Sk className="w-full h-2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const DashboardLoadingScreen = ({
  isLoading = false,
  variant,
}: DashboardLoadingScreenProps) => {
  if (!isLoading) return null;

  const ContentSkeleton =
    variant === 'performance'
      ? PerformanceSkeleton
      : variant === 'variant'
      ? VariantSkeleton
      : AnomalySkeleton;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <SidebarSk />
      <main className="ml-60">
        <HeaderSk />
        <ContentSkeleton />
      </main>
    </div>
  );
};

export default DashboardLoadingScreen;
