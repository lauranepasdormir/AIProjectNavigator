#!/usr/bin/env node

/**
 * Script to fix admin panel authentication issues in production
 * This script focuses on ensuring the admin account works properly with session storage
 * 
 * Usage: 
 *   - node scripts/fix-production-auth.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('=== Production Authentication Fix ===');

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

// Hash password function (matching the one in auth.ts)
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

const databaseUrl = getDatabaseUrl();
console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);

// Create optimized connection pool
const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

async function fixAuthentication() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✓ Database connection successful');
    
    // 1. Ensure users table exists with correct structure
    console.log('Checking users table...');
    const userTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!userTableResult.rows[0].exists) {
      console.log('Creating users table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" serial PRIMARY KEY,
          "username" text NOT NULL UNIQUE,
          "password" text NOT NULL,
          "created_at" timestamp NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✓ Users table created');
    } else {
      console.log('✓ Users table exists');
      
      // Check structure
      const userColumnsResult = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);
      
      console.log('Users table structure:');
      userColumnsResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
    }
    
    // 2. Ensure session table exists with correct structure
    console.log('\nChecking session table...');
    const sessionTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);
    
    if (!sessionTableResult.rows[0].exists) {
      console.log('Creating session table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        )
      `);
      
      // Create index for faster expiration queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);
      
      console.log('✓ Session table and index created');
    } else {
      console.log('✓ Session table exists');
      
      // Check structure
      const sessionColumnsResult = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'session'
        ORDER BY ordinal_position;
      `);
      
      console.log('Session table structure:');
      sessionColumnsResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
    }
    
    // 3. Check for admin user and recreate if needed
    console.log('\nChecking admin user...');
    const adminResult = await client.query(`
      SELECT id, username, password
      FROM users
      WHERE username = 'admin'
    `);
    
    if (adminResult.rows.length === 0) {
      console.log('Creating admin user...');
      
      // Create a new hashed password for admin
      const hashedPassword = await hashPassword('admin');
      
      // Insert admin user
      const insertResult = await client.query(`
        INSERT INTO users (username, password, created_at)
        VALUES ('admin', $1, NOW())
        RETURNING id
      `, [hashedPassword]);
      
      console.log(`✓ Admin user created with ID: ${insertResult.rows[0].id}`);
    } else {
      console.log(`✓ Admin user exists with ID: ${adminResult.rows[0].id}`);
      
      // Reset admin password to ensure it works
      console.log('Resetting admin password to ensure it works properly...');
      const hashedPassword = await hashPassword('admin');
      
      await client.query(`
        UPDATE users
        SET password = $1
        WHERE username = 'admin'
      `, [hashedPassword]);
      
      console.log('✓ Admin password reset successfully');
    }
    
    // 4. Clear any existing sessions to force fresh logins
    console.log('\nClearing existing sessions to ensure fresh authentication...');
    await client.query(`
      DELETE FROM session
    `);
    console.log('✓ All sessions cleared');
    
    // 5. Test inserting a dummy session to verify session table works
    console.log('\nTesting session table with a dummy session...');
    const now = new Date();
    const future = new Date(now.getTime() + 86400000); // +1 day
    
    await client.query(`
      INSERT INTO "session" ("sid", "sess", "expire")
      VALUES ($1, $2, $3)
    `, [
      'test_session',
      JSON.stringify({ 
        cookie: { originalMaxAge: 86400000 },
        passport: { user: 1 }
      }),
      future
    ]);
    
    console.log('✓ Successfully inserted test session');
    
    // Verify we can read the session
    const sessionResult = await client.query(`
      SELECT sid, sess, expire
      FROM session
      WHERE sid = 'test_session'
    `);
    
    if (sessionResult.rows.length > 0) {
      console.log('✓ Successfully retrieved test session');
      console.log(`Session data: ${JSON.stringify(sessionResult.rows[0].sess)}`);
    } else {
      console.error('❌ Failed to retrieve test session');
    }
    
    // Clean up test session
    await client.query(`
      DELETE FROM session
      WHERE sid = 'test_session'
    `);
    console.log('✓ Cleaned up test session');
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error fixing authentication:', error);
    console.error('Error details:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  try {
    const success = await fixAuthentication();
    
    if (success) {
      console.log('\n=== Production Authentication Fix Completed ===');
      console.log('✓ Users table verified/created');
      console.log('✓ Session table verified/created');
      console.log('✓ Admin user verified/reset');
      console.log('✓ Sessions cleared and tested');
      
      console.log('\nAdmin login credentials:');
      console.log('Username: admin');
      console.log('Password: admin');
      
      console.log('\nYou can now deploy your application with confidence.');
    } else {
      console.error('\n❌ Production Authentication Fix Failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();