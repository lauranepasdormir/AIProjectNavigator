import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pool with improved settings for reliability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // increase from default
  idleTimeoutMillis: 30000, // timeout after 30 seconds
  connectionTimeoutMillis: 5000, // timeout after 5 seconds
});

// Create the drizzle instance directly - don't use the proxy as it breaks method chaining
export const db = drizzle({ client: pool, schema });
