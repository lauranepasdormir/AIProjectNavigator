## server/vite.ts
import compression from "compression";
app.use(compression());
  app.use(express.static(distPath, {
  maxAge: '1y',
  immutable: true
  }));

## vite.config.ts

// emulate __dirname in ESM for your aliases
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default d

optimizeDeps: {
    // pre-bundle these common libraries in dev so Vite serves 1 file, not dozens
    include: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "lucide-react",
      "nanoid"
    ]
  },

rollupOptions: {
    output: {
      manualChunks: {
        vendor: [
          "react",
          "react-dom",
          "@tanstack/react-query",
          "lucide-react"
        ]
      }
    }
  }

## queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000, // 30 seconds
      retry: 3,
    },
    mutations: {
      retry: 3,
    },
  },
});

## tailwind.config.ts
mode: "jit",
  purge: [
    "./client/src/**/*.{js,jsx,ts,tsx}",
    "./shared/**/*.{js,ts}",
  ],