import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: false,
  });

  const isNetworkError = error && (
    error.message.includes('fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('Failed to fetch') ||
    error.message.toLowerCase().includes('network')
  );

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
