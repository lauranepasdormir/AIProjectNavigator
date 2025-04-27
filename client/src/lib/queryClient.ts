import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // First try to parse as JSON for more structured error information
      const errorData = await res.json();
      console.error('API Error Response:', errorData);
      throw new Error(
        errorData.message || 
        errorData.error || 
        `API Error: ${res.status} ${res.statusText}`
      );
    } catch (parseError) {
      // If JSON parsing fails, fall back to text
      const text = await res.text();
      console.error('API Error (raw):', { status: res.status, text });
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
  }
}

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Create a clone of the response before checking if it's ok
  // This prevents the "body stream already read" error
  const resClone = res.clone();
  
  try {
    await throwIfResNotOk(res);
    return resClone;
  } catch (error) {
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`[QueryClient] Fetching data from: ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest' // Helps identify AJAX requests
        }
      });
      
      console.log(`[QueryClient] Response status for ${url}: ${res.status} ${res.statusText}`);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn(`[QueryClient] Unauthorized request to ${url}, returning null as configured`);
        return null;
      }
      
      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`[QueryClient] Data successfully fetched from ${url}`);
      return data;
    } catch (error) {
      console.error(`[QueryClient] Error fetching from ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
      retry: 3,
    },
    mutations: {
      retry: 3,
    },
  },
});
