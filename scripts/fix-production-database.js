#!/usr/bin/env node

/**
 * Script to fix production database connection issues
 * This script:
 * 1. Verifies the database connection
 * 2. Checks for tables and their structure
 * 3. Ensures proper database settings for production
 * 
 * Usage: 
 *   - node scripts/fix-production-database.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import ws from 'ws';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('=== Production Database Fix ===');

// Use production environment
process.env.NODE_ENV = 'production';

// Get the appropriate database URL based on environment
const getDatabaseUrl = () => {
  // In production, prefer PROD_DATABASE_URL if it's not empty
  if (process.env.PROD_DATABASE_URL && process.env.PROD_DATABASE_URL.trim() !== '') {
    console.log('Using PROD_DATABASE_URL');
    return process.env.PROD_DATABASE_URL;
  }
  
  // Fallback to the default DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('Using fallback DATABASE_URL');
    return process.env.DATABASE_URL;
  }
  
  throw new Error('Database URL must be set. Did you forget to provision a database?');
};

// Create a new connection pool for testing
async function testDatabase() {
  const databaseUrl = getDatabaseUrl();
  console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);
  
  const pool = new Pool({ 
    connectionString: databaseUrl,
    max: 10, 
    idleTimeoutMillis: 30000 
  });

  try {
    // Test basic connection
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✓ Database connection successful');
    
    // Check if tables exist
    console.log('Checking database tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`Found ${tablesResult.rowCount} tables:`);
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(tables);

    // Check project_submissions table specifically
    if (tables.includes('project_submissions')) {
      console.log('Checking project_submissions table structure...');
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'project_submissions'
      `);
      
      console.log(`Found ${columnsResult.rowCount} columns in project_submissions table`);
      
      // Check if there are any rows in the table
      const countResult = await client.query('SELECT COUNT(*) FROM project_submissions');
      const count = parseInt(countResult.rows[0].count);
      console.log(`project_submissions table has ${count} rows`);
      
      if (count > 0) {
        // Sample a few rows
        console.log('Sampling recent submissions:');
        const sampleResult = await client.query('SELECT id, title, username, visibility FROM project_submissions ORDER BY created_at DESC LIMIT 3');
        console.log(sampleResult.rows);
      }
    } else {
      console.log('⚠️ project_submissions table not found!');
    }
    
    client.release();
    console.log('✓ Database checks completed');
    
    // Run migration to ensure tables are up to date
    console.log('\nRunning database migration to ensure tables are up to date...');
    return new Promise((resolve, reject) => {
      const env = { ...process.env, NODE_ENV: 'production', DATABASE_URL: databaseUrl };
      exec('npx drizzle-kit push', { env }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Migration failed: ${error.message}`);
          reject(error);
          return;
        }
        
        console.log(stdout);
        console.log('✓ Database migration completed');
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Database error:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  try {
    await testDatabase();
    console.log('\n=== Production Database Fix Completed ===');
    console.log('Your database configuration has been verified and updated for production.');
    console.log('You can now deploy the application to production.');
  } catch (error) {
    console.error('\n❌ Production Database Fix Failed');
    console.error('Please check your database configuration and try again.');
    process.exit(1);
  }
}

main();