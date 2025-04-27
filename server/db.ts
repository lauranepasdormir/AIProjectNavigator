import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getDatabaseUrl, logEnvironment } from './env';

neonConfig.webSocketConstructor = ws;

// Log environment information
logEnvironment();

// Get the appropriate database URL
const databaseUrl = getDatabaseUrl();
console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);

// Create connection pool with event handlers
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 10, // Maximum number of clients the pool should contain
  idleTimeoutMillis: 30000 // How long a client is allowed to remain idle before being closed
});

// Log pool events
pool.on('connect', (client) => {
  console.log('New database client connected');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Create Drizzle instance with the connection pool
export const db = drizzle({ client: pool, schema });

// Test database connection on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection test successful');
    client.release();
  } catch (error) {
    console.error('Database connection test failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
  }
})();
