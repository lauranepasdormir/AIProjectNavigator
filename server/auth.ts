// auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { Express, Request, Response, NextFunction } from "express";
import { scrypt as _scrypt, randomBytes as _randomBytes } from "crypto";
import { promisify } from "util";
import { pool } from "./db";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

let authReady = false;

export function isAuthReady() {
  return authReady;
}


const scrypt = promisify(_scrypt);
const randomBytes = promisify(_randomBytes);

// Toggle detailed logging with `DEBUG_AUTH=true`
const DEBUG = process.env.DEBUG_AUTH === "true";
function log(...args: any[]) { if (DEBUG) console.log("[auth]", ...args); }
function logErr(...args: any[]) { if (DEBUG) console.error("[auth]", ...args); }

// Hard-coded admin credentials
const ADMIN_USERNAME = "admin@digitalvillage.com.au";
const ADMIN_PASSWORD = "Password123";

// Cache for admin password hash
let cachedAdminHash: string | null = null;
async function getAdminHash() : Promise<string> {
  if (cachedAdminHash) return cachedAdminHash;
  if (process.env.ADMIN_PASSWORD_HASH) {
    cachedAdminHash = process.env.ADMIN_PASSWORD_HASH;
  } else {
    const salt = (await randomBytes(16)).toString("hex");
    const buf = (await scrypt(ADMIN_PASSWORD, salt, 64)) as Buffer;
    cachedAdminHash = `${buf.toString("hex")}.${salt}`;
  }
  log("Admin hash ready");
  return cachedAdminHash;
}

// Compare a plaintext password to a stored hash
async function comparePasswords(plain: string, stored: string) {
  const [hashHex, salt] = stored.split(".");
  const buf = (await scrypt(plain, salt, 64)) as Buffer;
  return Buffer.from(hashHex, "hex").equals(buf);
}

export function setupAuth(app: Express) {
  // ————————————————————————
  // Session middleware (unchanged store)
  app.use(session({
    secret: process.env.SESSION_SECRET || "digital-village-secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 18 * 60 * 60 * 1000,
    },
    store: storage.sessionStore,
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  // ————————————————————————
  // Ensure Admin user, but only hash/update if needed
  (async function ensureAdminExists() {
    try {
      log("Checking for admin user...");
      const user = await storage.getUserByUsername(ADMIN_USERNAME);
      if (!user) {
        log("Admin not found, creating...");
        const hash = await getAdminHash();
        await storage.createUser({ username: ADMIN_USERNAME, password: hash });
        log("Admin created");
      } else {
        // Only update if the stored hash no longer matches
        const valid = await comparePasswords(ADMIN_PASSWORD, user.password);
        if (!valid) {
          log("Admin password changed — updating DB");
          const hash = await getAdminHash();
          const client = await pool.connect();
          try {
            await client.query(
              `UPDATE users SET password=$1 WHERE username=$2`,
              [hash, ADMIN_USERNAME]
            );
            log("Admin password updated");
          } finally {
            client.release();
          }
        } else {
          log("Admin password up-to-date");
        }
      }
    } catch (err) {
      logErr("ensureAdminExists error:", err);
    }
      finally {
      authReady = true;
      log("Auth setup complete");
    }
  })();

  // ————————————————————————
  // Passport Local Strategy (unchanged logic)
  passport.use(new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        log(`Login attempt: ${username}`);
        let user = await storage.getUserByUsername(username);
        if (!user && username === "admin") {
          log("Fallback to admin lookup");
          user = await storage.getUserByUsername(ADMIN_USERNAME);
        }
        if (!user) {
          log("User not found");
          return done(null, false, { message: "Invalid credentials" });
        }
        const ok = await comparePasswords(password, user.password);
        if (!ok) {
          log("Bad password");
          return done(null, false, { message: "Invalid credentials" });
        }
        log("Auth success");
        return done(null, user);
      } catch (err) {
        logErr("Auth strategy error:", err);
        return done(err);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // ————————————————————————
  // Middleware to protect API routes
  function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.method === "OPTIONS") return next();
    if (req.isAuthenticated()) return next();

    log("Unauthorized:", req.method, req.originalUrl);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Expose it for your routes.ts to use:
  // app.get("/api/secure-endpoint", isAuthenticated, handler)
  // /api/me, /api/project-submissions/:id, etc.

  // ————————————————————————
  // API login endpoint
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    interface AuthInfo {
      message?: string;
    }

    interface LoginResponse {
      id: number;
      username: string;
      success: boolean;
      message: string;
    }

    passport.authenticate(
      "local",
      (
      err: any,
      user: Express.User | false,
      info: AuthInfo | undefined
      ) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.login(user, (err: any) => {
        if (err) return next(err);
        req.session.save((err: any) => {
        if (err) return next(err);
        const response: LoginResponse = {
          id: user.id,
          username: user.username,
          success: true,
          message: "Login successful"
        };
        return res.json(response);
        });
      });
      }
    )(req, res, next);
  });

  // API logout endpoint
  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // API /me endpoint
  app.get("/api/me", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as Express.User;
    res.json({ id: user.id, username: user.username });
  });

  

  // Return the middleware so your routes.ts can destructure { isAuthenticated }
  return { isAuthenticated };
}
