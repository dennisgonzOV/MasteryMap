import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'spinner' | 'skeleton' | 'fullscreen';
  children?: React.ReactNode;
}

/**
 * Standardized loading component to eliminate duplicated loading UI patterns
 */
export function LoadingSpinner({ 
  className, 
  size = 'md', 
  text = "Loading...", 
  variant = 'spinner',
  children 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  };

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className={cn(
            "animate-spin rounded-full border-b-2 border-blue-600",
            sizeClasses[size],
            className
          )}></div>
          <span className={cn("text-gray-700", textSizeClasses[size])}>{text}</span>
        </div>
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          {children || (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 border rounded-lg">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <div className="flex items-center space-x-3">
        <div className={cn(
          "animate-spin rounded-full border-b-2 border-blue-600",
          sizeClasses[size]
        )}></div>
        {text && (
          <span className={cn("text-gray-700", textSizeClasses[size])}>{text}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Fullscreen loading component
 */
export function FullscreenLoader({ text = "Loading..." }: { text?: string }) {
  return <LoadingSpinner variant="fullscreen" text={text} />;
}

/**
 * Skeleton loading component
 */
export function SkeletonLoader({ 
  className, 
  children 
}: { 
  className?: string; 
  children?: React.ReactNode; 
}) {
  return (
    <LoadingSpinner 
      variant="skeleton" 
      className={className}
    >
      {children}
    </LoadingSpinner>
  );
}

/**
 * Inline loading component
 */
export function InlineLoader({ 
  size = 'sm', 
  text,
  className 
}: { 
  size?: 'sm' | 'md' | 'lg';
  text?: string; 
  className?: string;
}) {
  return (
    <LoadingSpinner 
      variant="spinner" 
      size={size}
      text={text}
      className={className}
    />
  );
}