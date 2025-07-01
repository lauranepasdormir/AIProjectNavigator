import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

import compression from "compression";


// emulate __filename & __dirname in ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viteLogger = createLogger();


const clientTemplate = path.resolve(
  __dirname,
  "..",
  "client",
  "index.html",
);

let rawTemplate: string | null = null;
let rawTemplateMtime = 0;

async function getRawTemplate() {
  const stat = await fs.promises.stat(clientTemplate);
  if (stat.mtimeMs > rawTemplateMtime) {
    rawTemplate = await fs.promises.readFile(clientTemplate, "utf-8");
    rawTemplateMtime = stat.mtimeMs;
  }
  return rawTemplate!;
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as true,
  };

  // Define distPath for use in this function
  const distPath = path.resolve(process.cwd(), "dist/public");

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // app.use(compression());
  app.use(compression());
  app.use(express.static(distPath, {
  maxAge: '1y',
  immutable: true
  }));

  app.use(vite.middlewares);
  // ─── Here is where you swap in the cached‐read logic ───────────────────
  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;

      // instead of reading from disk every time:
      const templateBase = await getRawTemplate();

      // still apply your nanoid (or skip it in dev):
      const hash = process.env.NODE_ENV === "development"
        ? "" 
        : `?v=${nanoid()}`;

      // patch in your script tag
      const template = templateBase.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx${hash}"`,
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).type("text/html").send(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
