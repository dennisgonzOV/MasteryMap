import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorLogId: string;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId()
    };
    this.errorLogId = '';
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Generate correlation ID for debugging
    this.errorLogId = this.state.errorId;
    
    // Enhanced error logging with context
    console.error('React Error Boundary caught an error:', {
      errorId: this.errorLogId,
      context: this.props.context || 'Unknown',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // In production, could send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, { 
      //   tags: { errorId: this.errorLogId, context: this.props.context },
      //   extra: errorInfo 
      // });
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorId: this.generateErrorId()
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center">
                {this.props.context 
                  ? `An error occurred in ${this.props.context}. `
                  : 'An unexpected error occurred. '
                }
                We've logged the issue and will investigate.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-gray-100 p-3 rounded text-sm">
                  <summary className="font-medium cursor-pointer mb-2">
                    Error Details (Development)
                  </summary>
                  <p className="text-red-600 font-mono text-xs">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Error ID: {this.state.errorId}
                  </p>
                </details>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={this.handleRetry} 
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different contexts

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: string,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary context={context} fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Component-specific error boundary
export function ComponentErrorBoundary({ 
  children, 
  componentName,
  showError = false 
}: { 
  children: ReactNode; 
  componentName: string;
  showError?: boolean;
}) {
  const fallback = showError ? (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <p className="text-red-800 text-sm">
        Error in {componentName} component
      </p>
    </div>
  ) : null;

  return (
    <ErrorBoundary context={componentName} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

// Navigation error boundary with minimal UI impact
export function NavigationErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      context="Navigation"
      fallback={
        <div className="bg-red-50 p-2 text-center">
          <p className="text-red-600 text-sm">Navigation temporarily unavailable</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Modal error boundary that preserves modal functionality
export function ModalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      context="Modal"
      fallback={
        <div className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-gray-600">Unable to load modal content</p>
          <Button onClick={() => window.location.reload()} className="mt-3" size="sm">
            Refresh Page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}