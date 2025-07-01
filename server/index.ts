import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs";
import { performStartupChecks } from "./startup-checks";
import { healthCheckMiddleware } from "./health-checks";

const app = express();

// Configure body parsers with increased limits and detailed error handling
app.use(express.json({ 
  limit: '1mb',
  strict: true, // Only accept arrays and objects
  verify: (req: Request, res: Response, buf: Buffer) => {
    try {
      JSON.parse(buf.toString());
    } catch (e: any) {
      console.error('Invalid JSON in request body', e);
      res.status(400).send({ 
        error: 'Invalid JSON in request body',
        message: e.message 
      });
      throw new Error('Invalid JSON');
    }
  }
}));

// Log all JSON parse errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('JSON parse error:', err.message);
    return res.status(400).send({ 
      error: 'Invalid JSON format',
      message: err.message
    });
  }
  next(err);
});

app.use(express.urlencoded({ 
  extended: true,
  limit: '1mb'
}));

// Check if we're in development mode
const isDevelopment = app.get("env") === "development";

// Add health check middleware to handle all health check endpoints
// This must be added early in the middleware chain to catch health checks before other middleware
app.use(healthCheckMiddleware);

// Root path
app.get('/', (req, res, next) => {
  // For production browser requests, serve the static HTML
  if (process.env.NODE_ENV === 'production') {
    const publicDir = path.resolve(process.cwd(), 'server/public');
    return res.sendFile(path.join(publicDir, 'index.html'));
  }
  
  // In development, let Vite handle all requests
  next();
});

// Always have a dedicated /app route
app.get('/app', (req, res, next) => {
  if (!isDevelopment) {
    // In production, serve the app HTML
    const publicDir = path.resolve(process.cwd(), 'server/public');
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    // In development, let Vite handle it
    next();
  }
});

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
  // Run startup checks to verify database configuration
  await performStartupChecks();
  
  // Register routes and get HTTP server
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
  const port = 5001;
  server.listen(port, "0.0.0.0", () => {
    log(`Server running at http://0.0.0.0:${port}`);
    log(`Health check endpoint available at http://0.0.0.0:${port}/health`);
  });
})();
