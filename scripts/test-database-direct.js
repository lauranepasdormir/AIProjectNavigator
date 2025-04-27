/**
 * Direct database test script to verify connection and schema
 * Run with: node scripts/test-database-direct.js
 */

import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Simple logger to track progress
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  // Also write to a file for persistence
  fs.appendFileSync('./db-test-log.txt', `[${timestamp}] ${message}\n`);
};

async function testDatabase() {
  if (!process.env.DATABASE_URL) {
    log('DATABASE_URL not found in environment');
    return;
  }
  
  log(`Testing connection to database at ${process.env.DATABASE_URL.split('@')[1] || 'DB URL masked'}`);
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
  
  try {
    log('Connecting to database...');
    const client = await pool.connect();
    log('Connected successfully!');
    
    try {
      // Test basic query
      log('Testing simple query...');
      const res = await client.query('SELECT 1 as result');
      log(`Query result: ${JSON.stringify(res.rows[0])}`);
      
      // List tables
      log('Listing database tables...');
      const tableRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      const tables = tableRes.rows.map(row => row.table_name);
      log(`Found tables: ${tables.join(', ')}`);
      
      // Check if users table exists and has the expected structure
      if (tables.includes('users')) {
        log('Examining users table structure...');
        const usersColumns = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'users';
        `);
        
        log(`Users table columns: ${JSON.stringify(usersColumns.rows.map(c => `${c.column_name} (${c.data_type})`))}`)
        
        // Check for admin user
        log('Checking for admin user...');
        const adminRes = await client.query(`
          SELECT id, username FROM users 
          WHERE username = 'admin' OR username = 'admin@digitalvillage.com.au'
        `);
        
        if (adminRes.rows.length > 0) {
          log(`Found admin user: ${JSON.stringify(adminRes.rows)}`);
          
          // Update the admin password directly
          log('Updating admin password for testing...');
          
          // Get the hashed admin password from auth.ts
          const hackPassword = process.argv[2] === 'reset' ? true : false;
          
          if (hackPassword) {
            // Simple, insecure password hash for testing - DO NOT USE IN PRODUCTION
            const password = '$2b$10$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuv';
            
            try {
              await client.query(`
                UPDATE users 
                SET password = $1
                WHERE username = 'admin' OR username = 'admin@digitalvillage.com.au'
              `, [password]);
              log('Admin password updated successfully for testing');
            } catch (pwError) {
              log(`Error updating admin password: ${pwError.message}`);
            }
          }
        } else {
          log('No admin user found');
          
          // Optionally create admin user
          if (process.argv[2] === 'create') {
            log('Creating admin user...');
            // Simple hash for 'admin' password - for testing only
            const username = 'admin';
            const password = '$2b$10$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuv'; 
            
            try {
              await client.query(`
                INSERT INTO users (username, password, created_at)
                VALUES ($1, $2, NOW())
              `, [username, password]);
              log('Admin user created successfully');
            } catch (createError) {
              log(`Error creating admin user: ${createError.message}`);
            }
          }
        }
      }
      
      // Check project_submissions table
      if (tables.includes('project_submissions')) {
        log('Examining project_submissions table structure...');
        const submissionsColumns = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'project_submissions';
        `);
        
        log(`Project submissions columns: ${JSON.stringify(submissionsColumns.rows.map(c => `${c.column_name} (${c.data_type})`))}`)
        
        // Count submissions
        const submissionCount = await client.query('SELECT COUNT(*) FROM project_submissions');
        log(`Found ${submissionCount.rows[0].count} project submissions`);
        
        // List a few submissions
        if (parseInt(submissionCount.rows[0].count) > 0) {
          const submissions = await client.query(`
            SELECT id, title, username, created_at 
            FROM project_submissions 
            ORDER BY created_at DESC 
            LIMIT 3
          `);
          
          log(`Recent submissions: ${JSON.stringify(submissions.rows)}`);
        }
      }
      
    } finally {
      log('Releasing database client');
      client.release();
    }
  } catch (err) {
    log(`Database connection error: ${err.message}`);
    log(`Error details: ${err.stack}`);
  } finally {
    log('Test complete');
    
    // Close the pool
    await pool.end();
  }
}

// Run the test
testDatabase().catch(err => {
  log(`Unexpected error: ${err.message}`);
  log(`Error stack: ${err.stack}`);
});