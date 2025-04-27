#!/usr/bin/env node

/**
 * Script to test database connection for the current environment.
 * This script helps verify that environment-specific database connections are working.
 * 
 * Usage: 
 *   - node scripts/test-db-connection.js    # Test connection to the current environment's database
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Configure WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Get the appropriate database URL based on environment
const getDatabaseUrl = () => {
  // In development, prefer DEV_DATABASE_URL if it's not empty
  if (isDevelopment && process.env.DEV_DATABASE_URL && process.env.DEV_DATABASE_URL.trim() !== '') {
    return process.env.DEV_DATABASE_URL;
  }
  
  // In production, prefer PROD_DATABASE_URL if it's not empty
  if (!isDevelopment && process.env.PROD_DATABASE_URL && process.env.PROD_DATABASE_URL.trim() !== '') {
    return process.env.PROD_DATABASE_URL;
  }
  
  // Fallback to the default DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  throw new Error('Database URL must be set. Did you forget to provision a database?');
};

// Get the database URL based on the current environment
const databaseUrl = getDatabaseUrl();

console.log(`Environment: ${isDevelopment ? 'development' : 'production'}`);
console.log(`Using database URL: ${databaseUrl}`);

async function testDatabaseConnection() {
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    console.log('Testing database connection...');
    
    // Simple query to verify connection
    const result = await pool.query('SELECT current_database() as db_name, current_timestamp as server_time');
    
    console.log('✅ Database connection successful!');
    console.log(`Database name: ${result.rows[0].db_name}`);
    console.log(`Server time: ${result.rows[0].server_time}`);
    
    // Show available tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nAvailable tables:');
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the database');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    // Close the connection
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Close the connection
    await pool.end();
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();