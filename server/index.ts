import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Check if we're in development mode
const isDevelopment = app.get("env") === "development";

// Add health check endpoint that always responds immediately
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// In production, handle root path specially
if (!isDevelopment) {
  // First, create a route for serving the application at /app
  app.get('/app', (_req, res) => {
    // Serve the full application at /app
    const publicDir = path.resolve(process.cwd(), 'server/public');
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Then create a root handler to serve either health check or the app
  // based on the "Accept" header
  app.get('/', (req, res) => {
    const acceptHeader = req.headers.accept || '';
    
    // If the client accepts HTML, serve the full app (probably a browser)
    if (acceptHeader.includes('text/html')) {
      const publicDir = path.resolve(process.cwd(), 'server/public');
      res.sendFile(path.join(publicDir, 'index.html'));
    } else {
      // Otherwise, send a simple OK for health checks
      res.status(200).send('OK');
    }
  });
} else {
  // In development, let Vite handle these routes
  app.get('/', (_req, res, next) => next());
  app.get('/app', (_req, res, next) => next());
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });
  
  // In production, ensure assets can be served from server/public
  if (!isDevelopment) {
    const serverPublicDir = path.resolve(process.cwd(), 'server/public');
    if (fs.existsSync(serverPublicDir)) {
      log(`Serving additional static files from: ${serverPublicDir}`, "express");
      app.use(express.static(serverPublicDir));
    }
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`Server running at http://0.0.0.0:${port}`);
    log(`Health check endpoint available at http://0.0.0.0:${port}/health`);
  });
})();
