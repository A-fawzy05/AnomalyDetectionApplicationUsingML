'use client';

interface DashboardLoadingScreenProps {
  dashboardName?: string;
  isLoading?: boolean;
}

const DashboardLoadingScreen = ({ 
  dashboardName = 'Dashboard',
  isLoading = false 
}: DashboardLoadingScreenProps) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-modal bg-background/95 backdrop-blur-sm flex items-center justify-center transition-colors duration-300">
      <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
        {/* Animated Dashboard Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-16 h-16 text-primary-foreground"
            >
              <rect x="6" y="6" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
              <line x1="6" y1="14" x2="42" y2="14" stroke="currentColor" strokeWidth="2" />
              <line x1="14" y1="14" x2="14" y2="42" stroke="currentColor" strokeWidth="2" />
              <rect x="20" y="20" width="8" height="8" rx="1" fill="currentColor" className="text-primary-foreground/80" />
              <rect x="32" y="20" width="8" height="8" rx="1" fill="currentColor" className="text-primary-foreground/60" />
              <rect x="20" y="32" width="8" height="8" rx="1" fill="currentColor" className="text-primary-foreground/40" />
            </svg>
          </div>
          
          {/* Orbiting dots */}
          <div className="absolute inset-0 w-24 h-24">
            {[0, 120, 240].map((rotation, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-primary animate-spin"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(-40px)`,
                  animationDelay: `${i * 150}ms`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading Content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Loading {dashboardName}
            </h2>
            <p className="font-sans text-muted-foreground">
              Preparing your dashboard with real-time data and analytics
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse" 
                 style={{ 
                   width: '70%',
                   animation: 'shimmer 2s infinite ease-in-out'
                 }} />
          </div>

          {/* Loading Steps */}
          <div className="space-y-2 text-left">
            {[
              'Fetching real-time data',
              'Analyzing patterns',
              'Generating insights',
              'Preparing visualization'
            ].map((step, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 text-sm text-muted-foreground"
                style={{
                  opacity: 0.3 + (index * 0.2),
                  animation: `fadeInUp 0.5s ease-out ${index * 200}ms forwards`
                }}
              >
                <div className={`w-2 h-2 rounded-full ${
                  index === 0 ? 'bg-primary animate-pulse' : 'bg-muted/50'
                }`} />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { width: 30%; }
          50% { width: 90%; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: inherit;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLoadingScreen;
