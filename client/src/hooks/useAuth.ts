import { useQuery } from "@tanstack/react-query";
import { ApiError, getQueryFn, isApiError } from "@/lib/queryClient";
import type { AuthUserDTO } from "@shared/contracts/api";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUserDTO | null, ApiError>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<AuthUserDTO | null>({ on401: "returnNull" }),
    retry: (failureCount, error) => {
      if (error.status === 401 || error.status === 403) {
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

  const isNetworkError = !!error && (
    (!isApiError(error)) ||
    error.message.includes("fetch") ||
    error.message.includes("NetworkError") ||
    error.message.includes("Failed to fetch") ||
    error.message.toLowerCase().includes("network")
  );

  const isAuthError = !!error && (
    error.status === 401 ||
    error.status === 403
  );

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    isNetworkError,
    isAuthError,
    hasError: !!error,
  };
}
