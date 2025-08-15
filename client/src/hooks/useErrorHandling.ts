import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

/**
 * Standardized error handling hook to eliminate duplicated error handling patterns
 */
export interface UseErrorHandlingOptions {
  networkError?: boolean;
  authError?: boolean;
  queryError?: Error | null;
  redirectOnAuth?: boolean;
  showToast?: boolean;
}

export function useErrorHandling(options: UseErrorHandlingOptions = {}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const {
    networkError = false,
    authError = false,
    queryError = null,
    redirectOnAuth = true,
    showToast = true
  } = options;

  // Handle network errors
  useEffect(() => {
    if (networkError && showToast) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    }
  }, [networkError, toast, showToast]);

  // Handle authentication errors
  useEffect(() => {
    if (authError) {
      if (showToast) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
      }
      
      if (redirectOnAuth) {
        setLocation("/login");
      }
    }
  }, [authError, setLocation, toast, redirectOnAuth, showToast]);

  // Handle query errors (like unauthorized errors from useQuery)
  useEffect(() => {
    if (queryError && isUnauthorizedError(queryError)) {
      if (showToast) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
      }
      
      if (redirectOnAuth) {
        setLocation("/login");
      }
    }
  }, [queryError, setLocation, toast, redirectOnAuth, showToast]);

  return {
    handleError: (error: Error | string, title: string = "Error") => {
      if (showToast) {
        toast({
          title,
          description: typeof error === 'string' ? error : error.message,
          variant: "destructive",
        });
      }
    },
    
    handleSuccess: (message: string, title: string = "Success") => {
      if (showToast) {
        toast({
          title,
          description: message,
          variant: "default",
        });
      }
    }
  };
}

/**
 * Auth-specific error handling hook
 */
export function useAuthErrorHandling(isLoading: boolean, isAuthenticated: boolean, errors: {
  isNetworkError?: boolean;
  isAuthError?: boolean;
  hasError?: boolean;
}) {
  const [, setLocation] = useLocation();
  const errorHandling = useErrorHandling({
    networkError: errors.isNetworkError,
    authError: errors.isAuthError,
    redirectOnAuth: true,
    showToast: true
  });

  // Redirect logic for authentication
  useEffect(() => {
    const shouldRedirectToLogin = !isLoading && (
      errors.isAuthError || 
      (!isAuthenticated && !errors.hasError)
    );

    if (shouldRedirectToLogin) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, errors.isAuthError, errors.hasError, setLocation]);

  return errorHandling;
}

/**
 * Query-specific error handling hook
 */
export function useQueryErrorHandling(error: Error | null, options: {
  redirectOnUnauthorized?: boolean;
  showErrorToast?: boolean;
} = {}) {
  const { redirectOnUnauthorized = true, showErrorToast = true } = options;
  
  return useErrorHandling({
    queryError: error,
    redirectOnAuth: redirectOnUnauthorized,
    showToast: showErrorToast
  });
}