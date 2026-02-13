import { QueryClient, QueryFunction } from "@tanstack/react-query";
import type { ApiErrorPayload } from "@shared/contracts/api";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload?: ApiErrorPayload;

  constructor(status: number, payload?: ApiErrorPayload, fallbackMessage?: string) {
    const message =
      payload?.message ||
      payload?.error ||
      fallbackMessage ||
      `Request failed with status ${status}`;
    super(`${status}: ${message}`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchWithAutoRefresh(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const initWithCredentials = {
    ...init,
    credentials: init?.credentials ?? ("include" as RequestCredentials),
  };
  const res = await fetch(input, initWithCredentials);

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return fetch(input, initWithCredentials);
    }
  }

  return res;
}

export async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let payload: ApiErrorPayload | undefined;

    if (text) {
      try {
        payload = JSON.parse(text) as ApiErrorPayload;
      } catch {
        payload = { message: text };
      }
    }

    throw new ApiError(res.status, payload, res.statusText);
  }
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function apiRequest(
  url: string,
  method: ApiMethod,
  data?: unknown | undefined,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const headers = new Headers(options.headers ?? {});
  let body: BodyInit | undefined;

  if (data instanceof FormData) {
    body = data;
  } else if (data !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(data);
  }

  const res = await fetchWithAutoRefresh(url, {
    method,
    headers,
    body,
    credentials: options.credentials ?? "include",
    signal: options.signal,
  });

  await throwIfResNotOk(res);
  return res;
}

export async function apiJsonRequest<T>(
  url: string,
  method: ApiMethod,
  data?: unknown | undefined,
  options: ApiRequestOptions = {},
): Promise<T> {
  const res = await apiRequest(url, method, data, options);
  return parseJsonResponse<T>(res);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  const { on401: unauthorizedBehavior } = options;
  return async ({ queryKey }) => {
    const res = await fetchWithAutoRefresh(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return parseJsonResponse<T>(res);
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
