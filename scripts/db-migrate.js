#!/usr/bin/env node

/**
 * Script to run database migrations with the correct environment-specific DATABASE_URL.
 * This script sets DATABASE_URL temporarily based on the current environment settings before running migrations.
 * 
 * Usage: 
 *   - node scripts/db-migrate.js    # Run database migrations with the correct DATABASE_URL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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
console.log('Running database migrations...');

// Run the drizzle migration with the correct DATABASE_URL
const env = { ...process.env, DATABASE_URL: databaseUrl };

// Execute the migration command
exec('npx drizzle-kit push', { env }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Migration failed: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Migration stderr: ${stderr}`);
  }
  
  console.log(stdout);
  console.log('Database migration completed successfully.');
});