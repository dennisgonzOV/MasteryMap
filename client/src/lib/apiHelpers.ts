import {
  apiJsonRequest,
  apiRequest,
  parseJsonResponse,
  type ApiRequestOptions as HttpRequestOptions,
} from "./queryClient";

/**
 * Standardized API request patterns to eliminate duplicated fetch code
 */

export interface ApiRequestOptions extends HttpRequestOptions {
  timeout?: number;
}

/**
 * Standard GET request with consistent error handling
 */
export async function apiGet<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { credentials = "include", headers = {}, timeout = 10000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await apiJsonRequest<T>(url, "GET", undefined, {
      credentials,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timeout");
    }

    throw error;
  }
}

/**
 * Standard POST request using existing apiRequest utility
 */
export async function apiPost<T = unknown>(url: string, data: unknown): Promise<T> {
  return apiJsonRequest<T>(url, "POST", data);
}

/**
 * Standard PUT request using existing apiRequest utility
 */
export async function apiPut<T = unknown>(url: string, data: unknown): Promise<T> {
  return apiJsonRequest<T>(url, "PUT", data);
}

/**
 * Standard DELETE request using existing apiRequest utility
 */
export async function apiDelete<T = unknown>(url: string): Promise<T> {
  return apiJsonRequest<T>(url, "DELETE");
}

/**
 * PATCH request using existing apiRequest utility
 */
export async function apiPatch<T = unknown>(url: string, data: unknown): Promise<T> {
  return apiJsonRequest<T>(url, "PATCH", data);
}

/**
 * Paginated API request helper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function apiGetPaginated<T = unknown>(
  url: string,
  params: { page?: number; limit?: number; [key: string]: unknown } = {}
): Promise<PaginatedResponse<T>> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const fullUrl = `${url}?${searchParams.toString()}`;
  return apiGet<PaginatedResponse<T>>(fullUrl);
}

/**
 * File upload helper
 */
export async function apiUploadFile(
  url: string,
  file: File,
  additionalData: Record<string, unknown> = {}
): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);

  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, String(value));
  });

  const response = await apiRequest(url, "POST", formData, { credentials: "include" });
  return parseJsonResponse(response);
}

/**
 * Batch API requests with error handling
 */
export async function apiBatch<T = unknown>(
  requests: Array<{ url: string; method?: string; data?: unknown }>
): Promise<Array<T | Error>> {
  const promises = requests.map(async ({ url, method = "GET", data }) => {
    try {
      switch (method.toUpperCase()) {
        case "GET":
          return await apiGet<T>(url);
        case "POST":
          return await apiPost<T>(url, data);
        case "PUT":
          return await apiPut<T>(url, data);
        case "DELETE":
          return await apiDelete<T>(url);
        case "PATCH":
          return await apiPatch<T>(url, data);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error) {
      return error as Error;
    }
  });
  
  return Promise.all(promises);
}

/**
 * API request with automatic retry logic
 */
export async function apiWithRetry<T = unknown>(
  requestFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const { 
    maxRetries = 3, 
    retryDelay = 1000,
    shouldRetry = (error) => !error.message.includes("401") && !error.message.includes("403")
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }

  throw lastError!;
}
