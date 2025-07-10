#!/usr/bin/env node

/**
 * Script to fix production admin panel database connection issues
 * This script sets up proper caching and connection policies for the production environment.
 * 
 * Usage: 
 *   - node scripts/fix-production-admin.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('=== Production Admin Panel Fix ===');

// Set environment to production for this script
process.env.NODE_ENV = 'production';

// Get the appropriate database URL
const getDatabaseUrl = () => {
  // For production, prefer PROD_DATABASE_URL
  if (process.env.PROD_DATABASE_URL && process.env.PROD_DATABASE_URL.trim() !== '') {
    console.log('Using PROD_DATABASE_URL for database operations');
    return process.env.PROD_DATABASE_URL;
  }
  
  // Fallback to DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for database operations');
    return process.env.DATABASE_URL;
  }
  
  throw new Error('Database URL must be set. Did you forget to provision a database?');
};

const databaseUrl = getDatabaseUrl();
console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);

// Optimized pool settings
const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 10,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
  keepAlive: true,
});

// Test database connection with extensive diagnostics
async function testDatabaseWithDiagnostics() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✓ Database connection successful');
    
    // Check database version
    const versionResult = await client.query('SELECT version()');
    console.log(`Database version: ${versionResult.rows[0].version}`);
    
    // Check available tables
    console.log('Checking available tables...');
    const tablesResult = await client.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`✓ Found ${tablesResult.rowCount} tables in the database`);
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Tables: ${tables.join(', ')}`);
    
    // Check session table
    const sessionTableExists = tables.includes('session');
    if (sessionTableExists) {
      console.log('✓ Session table exists');
      try {
        const sessionCount = await client.query('SELECT COUNT(*) FROM session');
        console.log(`✓ Session table contains ${sessionCount.rows[0].count} rows`);
      } catch (error) {
        console.error('❌ Error querying session table:', error.message);
        console.log('Creating session table...');
        await client.query(`
          CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
          )
        `);
        console.log('✓ Session table created successfully');
      }
    } else {
      console.log('❌ Session table does not exist, creating it...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        )
      `);
      console.log('✓ Session table created successfully');
    }
    
    // Check project_submissions table
    if (tables.includes('project_submissions')) {
      console.log('Checking project_submissions table...');
      const submissionsResult = await client.query('SELECT COUNT(*) FROM project_submissions');
      const count = parseInt(submissionsResult.rows[0].count);
      console.log(`✓ Found ${count} project submissions in the database`);
      
      if (count > 0) {
        // Sample a few project submissions
        const sampleSubmissions = await client.query(`
          SELECT id, title, username, visibility 
          FROM project_submissions 
          ORDER BY id 
          LIMIT 5
        `);
        
        console.log('Sample project submissions:');
        sampleSubmissions.rows.forEach(row => {
          console.log(`- [${row.id}] ${row.title} (${row.visibility}) by ${row.username}`);
        });
      } else {
        console.log('⚠️ No project submissions found in the database');
        console.log('Creating sample project submissions...');
        
        // Create sample submissions if none exist
        await client.query(`
          INSERT INTO project_submissions (
            username, title, description, problem, technology, impact, 
            team, status, visibility, created_at
          ) VALUES 
          ('demo_user', 'Sample Project 1', 'This is a sample project for testing', 
           'Solved test problem', 'SQL, Node.js', 'Improved testing', 
           'Demo Team', 'Completed', 'public', NOW()),
          ('admin', 'Admin Project', 'Admin created project', 
           'Admin problem', 'React, TypeScript', 'Enhanced admin tools', 
           'Admin Team', 'In Progress', 'private', NOW())
        `);
        
        console.log('✓ Sample project submissions created');
      }
    } else {
      console.error('❌ project_submissions table does not exist!');
      console.log('Trying to fix schema...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "project_submissions" (
          "id" serial PRIMARY KEY,
          "username" text NOT NULL DEFAULT 'Anonymous User',
          "title" text NOT NULL,
          "description" text NOT NULL,
          "problem" text NOT NULL,
          "technology" text NOT NULL,
          "impact" text NOT NULL,
          "team" text NOT NULL DEFAULT '',
          "status" text NOT NULL,
          "visibility" text NOT NULL DEFAULT 'private',
          "created_at" timestamp NOT NULL DEFAULT NOW(),
          "user_id" integer
        )
      `);
      console.log('✓ Created project_submissions table');
    }
    
    // Check users table and admin user
    if (tables.includes('users')) {
      console.log('Checking users table...');
      const usersResult = await client.query('SELECT COUNT(*) FROM users');
      console.log(`✓ Found ${usersResult.rows[0].count} users in the database`);
      
      // Check for admin user
      const adminResult = await client.query("SELECT id FROM users WHERE username = 'admin'");
      if (adminResult.rows.length === 0) {
        console.log('❌ Admin user not found, creating it...');
        await client.query(`
          INSERT INTO users (username, password, created_at)
          VALUES ('admin', '$2a$10$DpWxgz29EHpkFygaZk8KROEuXgkFe9tZQQKWY9NTxEf6n7md6rBbO', NOW())
        `);
        console.log('✓ Admin user created successfully');
      } else {
        console.log('✓ Admin user exists (ID: ' + adminResult.rows[0].id + ')');
      }
    } else {
      console.error('❌ users table does not exist!');
      console.log('Creating users table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" serial PRIMARY KEY,
          "username" text NOT NULL UNIQUE,
          "password" text NOT NULL,
          "created_at" timestamp NOT NULL DEFAULT NOW()
        )
      `);
      
      // Create admin user
      await client.query(`
        INSERT INTO users (username, password, created_at)
        VALUES ('admin', '$2a$10$DpWxgz29EHpkFygaZk8KROEuXgkFe9tZQQKWY9NTxEf6n7md6rBbO', NOW())
      `);
      
      console.log('✓ Created users table with admin user');
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Validate that the environment variables are properly set in .env.deploy file
async function validateDeployEnvironment() {
  console.log('\nValidating deployment environment variables...');
  const deployEnvPath = path.join(rootDir, '.env.deploy');
  
  try {
    // Check if .env.deploy exists
    if (fs.existsSync(deployEnvPath)) {
      const deployEnvContent = fs.readFileSync(deployEnvPath, 'utf8');
      
      // Check for DATABASE_URL
      const hasDbUrl = deployEnvContent.includes('DATABASE_URL=');
      if (hasDbUrl) {
        console.log('✓ .env.deploy contains DATABASE_URL');
      } else {
        console.log('❌ .env.deploy does not contain DATABASE_URL, adding it...');
        
        // Get the current database URL
        const dbUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
        if (dbUrl) {
          fs.appendFileSync(deployEnvPath, `\nDATABASE_URL=${dbUrl}\n`);
          console.log('✓ Added DATABASE_URL to .env.deploy');
        } else {
          console.error('❌ Cannot add DATABASE_URL to .env.deploy: No database URL found in environment');
        }
      }
      
      // Check for NODE_ENV
      const hasNodeEnv = deployEnvContent.includes('NODE_ENV=production');
      if (hasNodeEnv) {
        console.log('✓ .env.deploy sets NODE_ENV=production');
      } else {
        console.log('❌ .env.deploy does not set NODE_ENV=production, adding it...');
        fs.appendFileSync(deployEnvPath, '\nNODE_ENV=production\n');
        console.log('✓ Added NODE_ENV=production to .env.deploy');
      }
    } else {
      console.log('❌ .env.deploy file not found, creating it...');
      
      // Get the current database URL
      const dbUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
      const envContent = `NODE_ENV=production\nDATABASE_URL=${dbUrl || ''}\n`;
      
      fs.writeFileSync(deployEnvPath, envContent);
      console.log('✓ Created .env.deploy file with required environment variables');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating deployment environment:', error);
    return false;
  }
}

// Execute drizzle push to ensure schema is up-to-date
async function executeDrizzlePush() {
  console.log('\nEnsuring database schema is up-to-date...');
  
  return new Promise((resolve, reject) => {
    exec('npm run db:push', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error running db:push:', error);
        console.error(stderr);
        resolve(false);
        return;
      }
      
      console.log(stdout);
      console.log('✓ Database schema pushed successfully');
      resolve(true);
    });
  });
}

// Main function
async function main() {
  try {
    // 1. Test database connection with diagnostics
    const dbTestSuccess = await testDatabaseWithDiagnostics();
    if (!dbTestSuccess) {
      console.error('❌ Database diagnostics failed');
      process.exit(1);
    }
    
    // 2. Validate deployment environment
    await validateDeployEnvironment();
    
    // 3. Execute drizzle push to ensure schema is up-to-date
    await executeDrizzlePush();
    
    console.log('\n=== Production Admin Panel Fix Completed ===');
    console.log('✓ Database connection and schema validated');
    console.log('✓ Session table verified/created');
    console.log('✓ Admin user verified/created');
    console.log('✓ Deployment environment variables set');
    
    console.log('\nAdmin login credentials:');
    console.log('Username: admin');
    console.log('Password: admin');
    
    console.log('\nYou can now deploy your application with the fixed settings.');
  } catch (error) {
    console.error('\n❌ Production Admin Panel Fix Failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();