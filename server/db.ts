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

// Configure database pool with improved resilience settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Reduce max connections to prevent overwhelming the server
  idleTimeoutMillis: 15000, // Shorter idle timeout
  connectionTimeoutMillis: 10000, // Longer connection timeout
  ssl: true, // Always use SSL with Neon
  allowExitOnIdle: false // Don't exit on idle
});

// Log connection events
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});

// Create the drizzle instance directly - don't use the proxy as it breaks method chaining
export const db = drizzle({ client: pool, schema });

// Simple async function to check database availability
export async function checkDatabaseConnection(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT 1 as connected');
    return result.rows[0].connected === 1;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to connect to database:', errorMessage);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Export a function to get explicit metrics about pool usage
export function getPoolStatus() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
