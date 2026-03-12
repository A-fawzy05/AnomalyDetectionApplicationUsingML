'use client';

interface BenchmarkToggleProps {
  isIndustryBenchmark: boolean;
  onToggle: () => void;
}

const BenchmarkToggle = ({ isIndustryBenchmark, onToggle }: BenchmarkToggleProps) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-muted border border-border/30">
      <span className="font-caption text-sm text-muted-foreground">Benchmark:</span>
      <button
        onClick={onToggle}
        className="relative w-14 h-7 rounded-full transition-smooth"
        style={{ backgroundColor: isIndustryBenchmark ? '#10b981' : '#475569' }}
        aria-label={`Switch to ${isIndustryBenchmark ? 'internal' : 'industry'} benchmark`}
      >
        <div
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-base ${
            isIndustryBenchmark ? 'translate-x-8' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="font-caption text-sm font-medium text-foreground">
        {isIndustryBenchmark ? 'Industry' : 'Internal'}
      </span>
    </div>
  );
};

export default BenchmarkToggle;