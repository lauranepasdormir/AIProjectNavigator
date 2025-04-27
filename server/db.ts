import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getDatabaseUrl, logEnvironment, isDevelopment } from './env';

neonConfig.webSocketConstructor = ws;

// Log environment information
logEnvironment();

// Get the appropriate database URL
const databaseUrl = getDatabaseUrl();
console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);

// Create connection pool with optimized settings
export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 20, // Increase max pool size for better performance
  min: 2, // Keep at least 2 connections ready
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // Connection timeout
  allowExitOnIdle: false, // Don't exit when pool is idle to keep connections ready
  keepAlive: true, // Keep connections alive
  query_timeout: 10000 // Set query timeout to 10 seconds
});

// Log pool events
pool.on('connect', (client) => {
  console.log('New database client connected');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on database client', err);
  // Attempt to recreate the connection pool after error
  if (!isDevelopment) {
    console.log('Recreating connection pool due to error...');
  }
});

// Create Drizzle instance with the connection pool
export const db = drizzle({ client: pool, schema });

// Test database connection on startup
(async () => {
  let connectionRetries = 0;
  const maxRetries = 3;
  
  while (connectionRetries < maxRetries) {
    try {
      const client = await pool.connect();
      console.log('Database connection test successful');
      
      // Verify tables exist
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tables = tablesResult.rows.map(row => row.table_name);
      console.log(`Database contains the following tables: ${tables.join(', ')}`);
      
      // Check project_submissions table
      if (tables.includes('project_submissions')) {
        const countResult = await client.query('SELECT COUNT(*) FROM project_submissions');
        console.log(`Found ${countResult.rows[0].count} project submissions in the database`);
      }
      
      client.release();
      break; // Success, exit retry loop
    } catch (error) {
      connectionRetries++;
      console.error(`Database connection test failed (attempt ${connectionRetries}/${maxRetries}):`, error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      
      if (connectionRetries >= maxRetries) {
        console.error('Maximum connection retries reached. Please check your database configuration.');
        // We'll continue with the app, but database operations may fail
      } else {
        // Wait before retrying
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
})();
