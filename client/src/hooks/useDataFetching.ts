import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useErrorHandling } from './useErrorHandling';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiHelpers';

/**
 * Standardized data fetching hooks to eliminate duplication across components
 */

export interface UseDataFetchingOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: boolean | number | ((failureCount: number, error: Error) => boolean);
  refetchOnWindowFocus?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

export interface UseMutationOptions<TData = any, TVariables = any> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  invalidateQueries?: Array<QueryKey | string>;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

/**
 * Generic data fetching hook
 */
export function useDataFetching<T = any>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options: UseDataFetchingOptions = {}
) {
  const { handleError } = useErrorHandling();
  
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    gcTime = 10 * 60 * 1000, // 10 minutes
    retry = false,
    refetchOnWindowFocus = false,
    onError,
    onSuccess
  } = options;

  const result = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    gcTime,
    retry,
    refetchOnWindowFocus,
  });

  // Handle errors
  if (result.error && onError) {
    onError(result.error);
  } else if (result.error) {
    handleError(result.error, "Data Fetch Error");
  }

  // Handle success
  if (result.data && onSuccess) {
    onSuccess(result.data);
  }

  return {
    ...result,
    isEmpty: result.data === null || result.data === undefined,
    hasData: result.data !== null && result.data !== undefined,
  };
}

/**
 * REST API data fetching hook
 */
export function useApiData<T = any>(
  endpoint: string,
  options: UseDataFetchingOptions = {}
) {
  return useDataFetching<T>(
    [endpoint],
    () => apiGet<T>(endpoint),
    options
  );
}

/**
 * Paginated data fetching hook
 */
export function usePaginatedData<T = any>(
  endpoint: string,
  params: { page?: number; limit?: number; [key: string]: any } = {},
  options: UseDataFetchingOptions = {}
) {
  const queryKey = [endpoint, 'paginated', params];
  
  return useDataFetching(
    queryKey,
    async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const url = `${endpoint}?${searchParams.toString()}`;
      return apiGet<T>(url);
    },
    options
  );
}

/**
 * Generic mutation hook
 */
export function useDataMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useErrorHandling();
  
  const {
    onSuccess,
    onError,
    onSettled,
    invalidateQueries = [],
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = "Operation completed successfully"
  } = options;

  const toQueryKey = (queryKey: QueryKey | string): QueryKey =>
    typeof queryKey === "string" ? [queryKey] : queryKey;

  return useMutation({
    mutationFn,
    onSuccess: async (data, variables, context) => {
      // Invalidate specified queries
      if (invalidateQueries.length > 0) {
        await Promise.all(
          invalidateQueries.map(queryKey => 
            queryClient.invalidateQueries({ queryKey: toQueryKey(queryKey) })
          )
        );
      }
      
      // Show success toast
      if (showSuccessToast) {
        handleSuccess(successMessage);
      }
      
      // Call custom success handler
      if (onSuccess) {
        onSuccess(data, variables);
      }
    },
    onError: (error: Error, variables, context) => {
      // Show error toast
      if (showErrorToast) {
        handleError(error, "Operation Failed");
      }
      
      // Call custom error handler
      if (onError) {
        onError(error, variables);
      }
    },
    onSettled
  });
}

/**
 * REST API mutation hooks
 */
export function useCreateMutation<T = any, TData = any>(
  endpoint: string,
  options: UseMutationOptions<T, TData> = {}
) {
  return useDataMutation<T, TData>(
    (data) => apiPost<T>(endpoint, data),
    {
      successMessage: "Created successfully",
      ...options
    }
  );
}

export function useUpdateMutation<T = any, TData = any>(
  endpoint: string,
  options: UseMutationOptions<T, TData> = {}
) {
  return useDataMutation<T, TData>(
    (data) => apiPut<T>(endpoint, data),
    {
      successMessage: "Updated successfully",
      ...options
    }
  );
}

export function useDeleteMutation<T = any>(
  endpoint: string,
  options: UseMutationOptions<T, void> = {}
) {
  return useDataMutation<T, void>(
    () => apiDelete<T>(endpoint),
    {
      successMessage: "Deleted successfully",
      ...options
    }
  );
}

/**
 * Resource-specific hooks
 */
export function useProjects(options: UseDataFetchingOptions = {}) {
  return useApiData('/api/projects', options);
}

export function useProject(id: number, options: UseDataFetchingOptions = {}) {
  return useApiData(`/api/projects/${id}`, {
    enabled: !!id,
    ...options
  });
}

export function useMilestones(projectId: number, options: UseDataFetchingOptions = {}) {
  return useApiData(`/api/projects/${projectId}/milestones`, {
    enabled: !!projectId,
    ...options
  });
}

export function useAssessments(milestoneId?: number, options: UseDataFetchingOptions = {}) {
  const endpoint = milestoneId 
    ? `/api/milestones/${milestoneId}/assessments`
    : '/api/assessments';
    
  return useApiData(endpoint, {
    enabled: milestoneId ? !!milestoneId : true,
    ...options
  });
}

export function useSubmissions(assessmentId: number, options: UseDataFetchingOptions = {}) {
  return useApiData(`/api/assessments/${assessmentId}/submissions`, {
    enabled: !!assessmentId,
    ...options
  });
}

export function useCredentials(options: UseDataFetchingOptions = {}) {
  return useApiData('/api/credentials/student', options);
}

export function useNotifications(options: UseDataFetchingOptions = {}) {
  return useApiData('/api/notifications', options);
}

/**
 * Mutation hooks for common operations
 */
export function useCreateProject(options: UseMutationOptions = {}) {
  return useCreateMutation('/api/projects', {
    invalidateQueries: ['/api/projects'],
    ...options
  });
}

export function useUpdateProject(id: number, options: UseMutationOptions = {}) {
  return useUpdateMutation(`/api/projects/${id}`, {
    invalidateQueries: ['/api/projects', `/api/projects/${id}`],
    ...options
  });
}

export function useDeleteProject(id: number, options: UseMutationOptions = {}) {
  return useDeleteMutation(`/api/projects/${id}`, {
    invalidateQueries: ['/api/projects'],
    ...options
  });
}

export function useCreateSubmission(options: UseMutationOptions = {}) {
  return useCreateMutation('/api/submissions', {
    successMessage: "Submission created successfully",
    ...options
  });
}

export function useMarkNotificationRead(options: UseMutationOptions = {}) {
  return useDataMutation(
    (notificationId: number) => apiPost(`/api/notifications/${notificationId}/mark-read`, {}),
    {
      invalidateQueries: ['/api/notifications'],
      showSuccessToast: false,
      ...options
    }
  );
}

/**
 * Advanced data fetching patterns
 */
export function useInfiniteScroll<T = any>(
  endpoint: string,
  pageSize = 20,
  options: UseDataFetchingOptions = {}
) {
  // Implementation for infinite scroll pagination
  // This would use useInfiniteQuery from React Query
  // Simplified version for now
  return usePaginatedData<T>(endpoint, { limit: pageSize }, options);
}

export function useSearchableData<T = any>(
  endpoint: string,
  searchQuery: string,
  options: UseDataFetchingOptions = {}
) {
  return useApiData<T>(`${endpoint}?search=${encodeURIComponent(searchQuery)}`, {
    enabled: searchQuery.length > 0,
    ...options
  });
}

export function useFilteredData<T = any>(
  endpoint: string,
  filters: Record<string, any>,
  options: UseDataFetchingOptions = {}
) {
  const queryString = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryString.append(key, String(value));
    }
  });
  
  const url = `${endpoint}?${queryString.toString()}`;
  
  return useApiData<T>(url, options);
}
