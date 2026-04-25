'use client';

interface LoadingStateManagerProps {
  isLoading?: boolean;
  loadingText?: string;
  type?: 'overlay' | 'inline' | 'skeleton';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingStateManager = ({
  isLoading = false,
  loadingText = 'Loading...',
  type = 'overlay',
  size = 'md',
  className = ''
}: LoadingStateManagerProps) => {
  if (!isLoading) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  if (type === 'skeleton') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-8 bg-muted/50 rounded-md animate-pulse" />
        <div className="space-y-3">
          <div className="h-4 bg-muted/50 rounded-md animate-pulse" />
          <div className="h-4 bg-muted/50 rounded-md animate-pulse w-5/6" />
          <div className="h-4 bg-muted/50 rounded-md animate-pulse w-4/6" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-muted/50 rounded-md animate-pulse" />
          <div className="h-24 bg-muted/50 rounded-md animate-pulse" />
          <div className="h-24 bg-muted/50 rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  if (type === 'inline') {
    return (
      <div className={`flex items-center justify-center gap-3 py-8 ${className}`}>
        <div className="relative">
          <div className={`${sizeClasses[size]} border-4 border-muted/30 rounded-full`} />
          <div
            className={`
              absolute inset-0 ${sizeClasses[size]}
              border-4 border-primary border-t-transparent rounded-full
              animate-spin
            `}
          />
        </div>
        <span className={`font-sans font-medium ${textSizeClasses[size]} text-muted-foreground`}>
          {loadingText}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`
        fixed inset-0 z-modal
        bg-background/95 backdrop-blur-sm
        flex items-center justify-center
        transition-colors duration-300
        ${className}
      `}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 text-primary-foreground"
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
          
          {/* Spinning Ring */}
          <div className="absolute inset-0 w-20 h-20 border-4 border-primary/20 rounded-xl" />
          <div
            className="absolute inset-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-xl animate-spin"
            style={{ animationDuration: '1s' }}
          />
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <h3 className="font-serif font-semibold text-xl text-foreground mb-2">
            {loadingText}
          </h3>
          <p className="font-sans text-sm text-muted-foreground">
            Please wait while we process your request
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingStateManager;