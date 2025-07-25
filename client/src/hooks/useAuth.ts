import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors (authentication issues)
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  // Check for network errors
  const isNetworkError = error && (
    error.message.includes('fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('Failed to fetch') ||
    error.message.toLowerCase().includes('network')
  );

  // Check for authentication errors
  const isAuthError = error && (
    error.message.includes('401') ||
    error.message.includes('403') ||
    error.message.includes('Unauthorized')
  );

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
    isNetworkError,
    isAuthError,
    hasError: !!error,
  };
}
