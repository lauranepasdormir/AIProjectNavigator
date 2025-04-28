import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { pool } from "./db"; 
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Hardcoded admin credentials for the MVP
const ADMIN_EMAIL = "admin@digitalvillage.com.au";
const ADMIN_USERNAME = "admin@digitalvillage.com.au";  // Using email as username
const ADMIN_PASSWORD = "password123";  // Default password

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "digital-village-secret",
    resave: true,
    saveUninitialized: true,
    cookie: { 
      secure: false, // Set to false for development, even in production we're likely using HTTP
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
    },
    store: storage.sessionStore // Use the session store from storage.ts
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Create or update the admin user in the database
  async function ensureAdminExists() {
    try {
      console.log("Checking for admin user...");
      
      // Try to find admin by email
      let existingAdmin = await storage.getUserByUsername(ADMIN_EMAIL);
      
      // Also try to find admin by 'admin' username
      if (!existingAdmin) {
        existingAdmin = await storage.getUserByUsername(ADMIN_USERNAME);
      }
      
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);
      
      if (!existingAdmin) {
        // Create admin user if doesn't exist
        console.log("Creating new admin user...");
        
        // First try with admin username
        try {
          await storage.createUser({
            username: ADMIN_USERNAME,
            password: hashedPassword
          });
          console.log("Admin user created with username: admin");
        } catch (adminCreateError) {
          console.error("Error creating admin user with username admin:", adminCreateError);
          
          // Try with email as fallback
          try {
            await storage.createUser({
              username: ADMIN_EMAIL,
              password: hashedPassword
            });
            console.log("Admin user created with email");
          } catch (emailCreateError) {
            console.error("Error creating admin user with email:", emailCreateError);
          }
        }
      } else {
        // Use direct SQL to update the admin password
        console.log("Admin user found, updating password...");
        try {
          const client = await pool.connect();
          try {
            await client.query(
              'UPDATE users SET password = $1 WHERE username = $2 OR username = $3',
              [hashedPassword, ADMIN_EMAIL, ADMIN_USERNAME]
            );
            console.log("Admin password updated successfully");
          } finally {
            client.release();
          }
        } catch (updateError) {
          console.error("Error updating admin password:", updateError);
        }
      }
    } catch (error) {
      console.error("Error ensuring admin exists:", error);
    }
  }

  // Call this when setting up the auth
  ensureAdminExists();

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      async (username, password, done) => {
        try {
          console.log(`Login attempt for username: ${username}`);
          
          // First try using username as-is
          let user = await storage.getUserByUsername(username);
          
          // If not found, check if they're using 'admin' instead of the email
          if (!user && username === 'admin') {
            console.log('Checking for admin email account instead of "admin"');
            user = await storage.getUserByUsername(ADMIN_EMAIL);
          }
          
          if (!user) {
            console.log(`User not found: ${username}`);
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log(`User found, checking password for: ${user.username}`);
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            console.log(`Invalid password for user: ${username}`);
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log(`Login successful for: ${user.username}`);
          return done(null, user);
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    // Add debugging info
    console.log('Authentication check:');
    console.log(`- isAuthenticated: ${req.isAuthenticated()}`);
    console.log(`- Session ID: ${req.sessionID}`);
    console.log(`- Session data:`, req.session);
    console.log(`- User data:`, req.user || 'No user');
    
    // Always allow OPTIONS requests to pass through for CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request detected, allowing through for CORS');
      return next();
    }
    
    if (req.isAuthenticated()) {
      console.log('User is authenticated, proceeding...');
      return next();
    }
    
    // Special case for paths where authentication is needed but we should return nicely formatted errors
    if (req.path.startsWith('/api/')) {
      console.log('User is NOT authenticated on API endpoint, returning 401');
      
      // Set appropriate headers to prevent caching of unauthorized responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Please log in to access this resource',
        path: req.path
      });
    }
    
    console.log('User is NOT authenticated, returning 401');
    res.status(401).json({ error: 'Unauthorized' });
  }

  // Auth routes
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    console.log("Login request received:", { 
      body: req.body,
      bodyType: typeof req.body,
      username: req.body?.username,
      hasPassword: !!req.body?.password
    });
    console.log(`Current session ID before login: ${req.sessionID}`);
    
    // Set cache headers immediately
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Make sure we have a properly parsed body
    if (typeof req.body !== 'object') {
      console.error("Request body is not an object, body parser may not be working:", req.body);
      return res.status(400).json({ error: "Invalid request format. Make sure Content-Type is application/json." });
    }
    
    // Check for empty body - explicit check against null/undefined
    if (req.body === null || req.body === undefined) {
      console.error("Request body is null or undefined");
      return res.status(400).json({ error: "Empty request body" });
    }
    
    // Check for missing fields specifically
    if (!req.body.username) {
      console.error("Missing username in request");
      return res.status(401).json({ error: "Username is required" });
    }
    
    if (!req.body.password) {
      console.error("Missing password in request");
      return res.status(401).json({ error: "Password is required" });
    }
    
    // Special handling for our hardcoded admin account
    // This bypasses Passport for the admin user to ensure reliability
    if (req.body.username === ADMIN_USERNAME && req.body.password === ADMIN_PASSWORD) {
      console.log("Admin credentials detected, using direct login path");
      
      // Get the admin user from storage
      storage.getUserByUsername(ADMIN_USERNAME)
        .then(adminUser => {
          if (!adminUser) {
            console.log("Admin user not found in database, creating it first");
            return hashPassword(ADMIN_PASSWORD)
              .then(hashedPassword => {
                return storage.createUser({
                  username: ADMIN_USERNAME,
                  password: hashedPassword
                });
              });
          }
          return adminUser;
        })
        .then(adminUser => {
          // Manually log in the user by calling req.login
          req.login(adminUser, (err) => {
            if (err) {
              console.error("Admin direct login error:", err);
              return next(err);
            }
            
            console.log(`Admin user successfully logged in via direct path`);
            console.log(`- Session ID after admin login: ${req.sessionID}`);
            console.log(`- Session after admin login:`, req.session);
            
            // Validate that authentication worked 
            console.log(`- Is authenticated after login: ${req.isAuthenticated()}`);
            
            // Return successful response
            return res.json({ 
              id: adminUser.id,
              username: adminUser.username,
              message: "Login successful (direct path)",
              sessionId: req.sessionID,
              authenticated: true
            });
          });
        })
        .catch(error => {
          console.error("Error in direct admin login:", error);
          return res.status(500).json({ error: "Login error", message: error.message });
        });
      
      return; // End execution here for direct path
    }
    
    // Regular path using Passport for non-admin users
    passport.authenticate("local", (err: Error, user: Express.User, info: { message: string }) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.error("Login failed - invalid credentials:", info.message);
        return res.status(401).json({ error: info.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return next(err);
        }
        
        console.log(`User ${user.username} (ID: ${user.id}) successfully logged in`);
        console.log(`- Session ID after login: ${req.sessionID}`);
        console.log(`- Session after login:`, req.session);
        console.log(`- Is authenticated after login: ${req.isAuthenticated()}`);
        
        return res.json({ 
          id: user.id,
          username: user.username,
          message: "Login successful",
          sessionId: req.sessionID, // Include session ID for debugging
          authenticated: true
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/me", (req: Request, res: Response) => {
    console.log('API /me endpoint:');
    console.log(`- isAuthenticated: ${req.isAuthenticated()}`);
    console.log(`- Session ID: ${req.sessionID}`);
    console.log(`- Session data:`, req.session);
    console.log(`- User data:`, req.user || 'No user');
    
    if (!req.isAuthenticated()) {
      console.log('User is NOT authenticated on /api/me endpoint');
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as Express.User;
    console.log(`User is authenticated as ${user.username} (ID: ${user.id})`);
    
    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    
    res.json({
      id: user.id,
      username: user.username
    });
  });

  // Return the middleware for use in routes
  return { isAuthenticated };
}