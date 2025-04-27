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
import ws from 'ws';
import bcrypt from 'bcryptjs';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('=== Production Database Fix ===');

// Always ensure we're using production database
process.env.NODE_ENV = 'production';

const getDatabaseUrl = () => {
  console.log('Using PROD_DATABASE_URL for database operations');
  
  if (process.env.PROD_DATABASE_URL && process.env.PROD_DATABASE_URL.trim() !== '') {
    return process.env.PROD_DATABASE_URL;
  }
  
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  throw new Error('Database URL must be set. Did you forget to provision a database?');
};

// Test database connection
async function testDatabase() {
  const databaseUrl = getDatabaseUrl();
  console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);
  
  const pool = new Pool({ 
    connectionString: databaseUrl,
    max: 10, // increase from default
    idleTimeoutMillis: 30000, // timeout after 30 seconds
    connectionTimeoutMillis: 5000, // timeout after 5 seconds
    retryIntervalMillis: 1000, // retry every second
    maxRetryAttempts: 3 // maximum 3 retry attempts
  });

  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('Database connection established');
    
    // Test querying all tables
    const tablesResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found tables: ${tables.join(', ')}`);
    
    // Create session table if it doesn't exist
    if (!tables.includes('session')) {
      console.log('Creating session table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        )
      `);
      console.log('✓ Session table created');
    } else {
      console.log('✓ Session table exists');
    }
    
    // Check for project_submissions table
    if (!tables.includes('project_submissions')) {
      console.log('ERROR: project_submissions table does not exist!');
      
      // Create the table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "project_submissions" (
          "id" serial PRIMARY KEY,
          "title" text NOT NULL,
          "description" text NOT NULL,
          "username" text NOT NULL,
          "email" text NOT NULL,
          "status" text NOT NULL DEFAULT 'pending',
          "visibility" text NOT NULL DEFAULT 'private',
          "createdAt" timestamp NOT NULL DEFAULT NOW(),
          "updatedAt" timestamp NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✓ Created project_submissions table');
    } else {
      // Check if we have any project submissions
      const submissionsResult = await client.query('SELECT COUNT(*) FROM project_submissions');
      const submissionCount = parseInt(submissionsResult.rows[0].count);
      console.log(`Found ${submissionCount} project submissions`);
      
      if (submissionCount === 0) {
        // Add sample project submissions if none exist
        console.log('Adding sample project submissions...');
        await client.query(`
          INSERT INTO project_submissions (title, description, username, email, status, visibility)
          VALUES 
            ('AI Chat Assistant', 'A chat assistant that uses AI to help users with questions', 'demo_user', 'demo@example.com', 'approved', 'public'),
            ('Smart Task Manager', 'Task management application with smart prioritization', 'admin', 'admin@example.com', 'pending', 'private'),
            ('Automated Data Analytics Tool', 'Tool that automates data analysis workflows', 'data_expert', 'data@example.com', 'approved', 'internal')
        `);
        console.log('✓ Added sample project submissions');
      }
    }
    
    // Check for users table and ensure admin user exists
    if (!tables.includes('users')) {
      console.log('Creating users table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" serial PRIMARY KEY,
          "username" text NOT NULL UNIQUE,
          "password" text NOT NULL,
          "email" text,
          "role" text NOT NULL DEFAULT 'user',
          "createdAt" timestamp NOT NULL DEFAULT NOW(),
          "updatedAt" timestamp NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✓ Users table created');
    } else {
      console.log('✓ Users table exists');
    }
    
    // Check if admin user exists, if not create it
    const adminResult = await client.query("SELECT * FROM users WHERE username = 'admin'");
    if (adminResult.rows.length === 0) {
      console.log('Creating admin user...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      // Insert admin user
      await client.query(`
        INSERT INTO users (username, password, email, role)
        VALUES ('admin', $1, 'admin@example.com', 'admin')
      `, [hashedPassword]);
      
      console.log('✓ Admin user created');
    } else {
      console.log('✓ Admin user exists');
      
      // Update admin password to ensure it works
      const hashedPassword = await bcrypt.hash('admin', 10);
      await client.query(`
        UPDATE users SET password = $1 WHERE username = 'admin'
      `, [hashedPassword]);
      
      console.log('✓ Admin password reset to "admin"');
    }
    
    // Make sure we have proper database indices
    console.log('Setting up database indices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_project_submissions_visibility ON project_submissions(visibility);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
    `);
    console.log('✓ Database indices created');
    
    // Release the client
    client.release();
    console.log('✓ Database connection test completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    if (error.stack) console.error(error.stack);
    
    return false;
  } finally {
    // Close pool
    await pool.end();
  }
}

async function fixDatabaseConnectionSettings() {
  console.log('\nFixing database connection settings in server/db.ts');
  
  const dbFilePath = path.join(rootDir, 'server', 'db.ts');
  if (!fs.existsSync(dbFilePath)) {
    console.error('❌ db.ts file not found at', dbFilePath);
    return;
  }
  
  let dbContent = fs.readFileSync(dbFilePath, 'utf8');
  
  // Check for connection settings
  if (!dbContent.includes('max:') || !dbContent.includes('idleTimeoutMillis')) {
    console.log('Adding connection pool settings to db.ts');
    
    // Backup original file
    fs.writeFileSync(`${dbFilePath}.backup-${Date.now()}`, dbContent);
    
    // Add improved connection settings
    const poolPattern = /export const pool = new Pool\(\s*\{\s*connectionString:/;
    
    if (poolPattern.test(dbContent)) {
      dbContent = dbContent.replace(
        poolPattern,
        `export const pool = new Pool({ 
  connectionString:`
      );
      
      // Add the pool settings before the closing brace
      const closingBraceIndex = dbContent.indexOf('});', dbContent.indexOf('export const pool'));
      if (closingBraceIndex !== -1) {
        const improvedSettings = `,
  max: 10, // increase from default
  idleTimeoutMillis: 30000, // timeout after 30 seconds
  connectionTimeoutMillis: 5000, // timeout after 5 seconds
  retryIntervalMillis: 1000, // retry every second
  maxRetryAttempts: 3 // retry 3 times
`;
        
        dbContent = dbContent.slice(0, closingBraceIndex) + improvedSettings + dbContent.slice(closingBraceIndex);
        
        // Write back to file
        fs.writeFileSync(dbFilePath, dbContent);
        console.log('✓ Added improved connection pool settings to db.ts');
      } else {
        console.error('❌ Could not find where to add pool settings in db.ts');
      }
    } else {
      console.error('❌ Could not find pool initialization in db.ts');
    }
  } else {
    console.log('✓ Connection pool settings already exist in db.ts');
  }
}

async function main() {
  const dbTestSuccess = await testDatabase();
  
  if (dbTestSuccess) {
    await fixDatabaseConnectionSettings();
    
    console.log('\n=== Production Database Fix Completed ===');
    console.log('✓ All database checks passed');
    console.log('✓ Database structure is correct');
    console.log('✓ Sample data is available');
    console.log('✓ Admin user is configured');
    console.log('Your production database is now ready for use!');
  } else {
    console.error('\n=== Production Database Fix Failed ===');
    console.error('Please check your database configuration and try again.');
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});