#!/usr/bin/env node

/**
 * Script to fix session management in production
 * This script ensures the session table exists and is properly configured
 * 
 * Usage: 
 *   - node scripts/fix-production-sessions.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('=== Production Session Fix ===');

// Get the appropriate database URL
const getDatabaseUrl = () => {
  if (process.env.PROD_DATABASE_URL && process.env.PROD_DATABASE_URL.trim() !== '') {
    console.log('Using PROD_DATABASE_URL for database operations');
    return process.env.PROD_DATABASE_URL;
  }
  
  console.log('Using DATABASE_URL for database operations');
  return process.env.DATABASE_URL;
};

const databaseUrl = getDatabaseUrl();
console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);

// Create session table
async function createSessionTable() {
  // Create optimized connection pool
  const pool = new Pool({ 
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000
  });

  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✓ Database connection successful');
    
    // Check if session table exists
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);
    
    const sessionTableExists = tableResult.rows[0].exists;
    
    if (sessionTableExists) {
      console.log('✓ Session table already exists');
      
      // Verify session table structure
      const columnResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'session'
        ORDER BY ordinal_position;
      `);
      
      console.log('Session table structure:');
      columnResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''})`);
      });
      
      // Create index on session if it doesn't exist
      try {
        const indexResult = await client.query(`
          SELECT indexname FROM pg_indexes 
          WHERE tablename = 'session' AND indexname = 'IDX_session_expire';
        `);
        
        if (indexResult.rows.length === 0) {
          console.log('Creating index on session.expire...');
          await client.query(`
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
          `);
          console.log('✓ Created index on session.expire');
        } else {
          console.log('✓ Index on session.expire already exists');
        }
      } catch (error) {
        console.error('Error checking/creating index:', error.message);
      }
    } else {
      console.log('Creating session table...');
      
      // Create session table
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
      
      console.log('✓ Session table and index created successfully');
    }
    
    // Test inserting a session
    console.log('Testing session table with a dummy session...');
    const now = new Date();
    const future = new Date(now.getTime() + 86400000); // +1 day
    
    await client.query(`
      INSERT INTO "session" ("sid", "sess", "expire")
      VALUES ($1, $2, $3)
      ON CONFLICT ("sid") DO UPDATE SET
        "sess" = $2,
        "expire" = $3
    `, [
      'test_session',
      JSON.stringify({ cookie: { originalMaxAge: 86400000 } }),
      future
    ]);
    
    console.log('✓ Successfully inserted test session');
    
    // Cleanup test session
    await client.query(`DELETE FROM "session" WHERE "sid" = 'test_session'`);
    console.log('✓ Cleaned up test session');
    
    client.release();
    
    console.log('✓ Session table is properly set up');
    return true;
  } catch (error) {
    console.error('❌ Error setting up session table:', error);
    console.error('Error details:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  try {
    // Create session table
    const success = await createSessionTable();
    
    if (success) {
      console.log('\n=== Production Session Fix Completed ===');
      console.log('The session table has been verified and is correctly configured.');
      console.log('This should fix any authentication issues in the admin panel.');
      console.log('\nYou can now deploy your application with confidence.');
    } else {
      console.error('\n❌ Production Session Fix Failed');
      console.error('Please check your database configuration and try again.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();