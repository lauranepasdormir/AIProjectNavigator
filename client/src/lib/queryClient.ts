// src/lib/queryClient.ts

import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Throws an error if the response is not OK (status not in the 200–299 range).
 * Attempts to parse error details from JSON, or falls back to raw text.
 */
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    try {
      const errorData = await res.json();
      console.error("API Error Response:", errorData);
      throw new Error(
        errorData.message ||
        errorData.error ||
        `API Error: ${res.status} ${res.statusText}`
      );
    } catch {
      const text = await res.text();
      console.error("API Error (raw):", { status: res.status, text });
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
  }
}

/**
 * Generic API request helper for GET/POST/PUT/DELETE with JSON payloads.
 */
export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: unknown
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Important for cookie-based auth
  });

  // Clone before reading body to avoid "body already used" error
  const resClone = res.clone();

  await throwIfResNotOk(res);
  return resClone;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Returns a typed query function with optional 401 handling.
 */
export function getQueryFn<T>({ on401 }: { on401: UnauthorizedBehavior }): QueryFunction<T> {
  return async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`[QueryClient] Fetching from: ${url}`);

    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      console.log(`[QueryClient] Status ${res.status} from ${url}`);

      // Handle 401 unauthorized response as configured
      if (on401 === "returnNull" && res.status === 401) {
        console.warn(`[QueryClient] 401 Unauthorized at ${url}, returning null`);
        return null as T;
      }

      await throwIfResNotOk(res);
      const json = await res.json();
      return json as T;
    } catch (err) {
      console.error(`[QueryClient] Error fetching ${url}:`, err);
      throw err;
    }
  };
}

/**
 * Global shared QueryClient with default options.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30_000, // Refetch every 30s
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000, // Consider data fresh for 30s
      retry: 3, // Retry failed queries up to 3 times
    },
    mutations: {
      retry: 3, // Retry failed mutations up to 3 times
    },
  },
});
