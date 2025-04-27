#!/usr/bin/env node

/**
 * Script to directly test the project submissions database access
 * and API endpoint for diagnostic purposes.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import ws from 'ws';
import { drizzle } from 'drizzle-orm/neon-serverless';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('=== Project Submissions Debug ===');

// Get the development database URL
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error('Database URL must be set. Did you forget to provision a database?');
};

// Test direct database access
async function testDirectDbAccess() {
  console.log('\nTesting direct database access...');
  
  const databaseUrl = getDatabaseUrl();
  console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);
  
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Test a simple query
    console.log('Testing basic database connection...');
    const client = await pool.connect();
    const pingResult = await client.query('SELECT 1 as result');
    console.log('Database connection successful:', pingResult.rows[0]);
    
    // Check if project_submissions table exists
    console.log('\nChecking project_submissions table...');
    const tableQuery = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_submissions'
      );
    `);
    
    const tableExists = tableQuery.rows[0].exists;
    console.log('project_submissions table exists:', tableExists);
    
    if (tableExists) {
      // Get total count of project submissions
      const countQuery = await client.query('SELECT COUNT(*) FROM project_submissions');
      const count = parseInt(countQuery.rows[0].count);
      console.log(`Total project submissions: ${count}`);
      
      // Get a sample of project submissions
      if (count > 0) {
        const sampleQuery = await client.query('SELECT id, title, username, visibility FROM project_submissions LIMIT 3');
        console.log('Sample project submissions:');
        sampleQuery.rows.forEach(row => {
          console.log(`- ID: ${row.id}, Title: ${row.title}, User: ${row.username}, Visibility: ${row.visibility}`);
        });
      }
    }
    
    // Test loading through drizzle ORM
    console.log('\nTesting Drizzle ORM access...');
    
    // Import schema
    const schemaModule = await import('../shared/schema.js');
    const schema = schemaModule;
    
    // Create drizzle instance
    const db = drizzle({ client: pool, schema });
    
    // Try to select all project submissions
    try {
      console.log('Selecting all project submissions through Drizzle...');
      const projectSubmissions = schema.projectSubmissions;
      
      // View the structure of projectSubmissions
      console.log('Project submissions schema structure:', Object.keys(projectSubmissions));
      
      const results = await db.select().from(projectSubmissions);
      console.log(`Successfully retrieved ${results.length} project submissions through Drizzle`);
      
      if (results.length > 0) {
        console.log('First submission:', results[0]);
      }
    } catch (drizzleError) {
      console.error('Error accessing project submissions through Drizzle:', drizzleError);
      console.error('Error message:', drizzleError.message);
      if (drizzleError.stack) console.error('Stack trace:', drizzleError.stack);
    }
    
    client.release();
  } catch (error) {
    console.error('Database access error:', error);
    console.error('Error message:', error.message);
    if (error.stack) console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Test the API endpoint
async function testApiEndpoint() {
  console.log('\nTesting API endpoint...');
  
  try {
    console.log('Logging in to get authenticated session...');
    
    // First, try to login
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      }),
      credentials: 'include'
    });
    
    const loginCookies = loginResponse.headers.get('set-cookie');
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status, loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    console.log('Login successful');
    
    // Now try to access the project submissions endpoint
    console.log('Accessing /api/project-submissions endpoint...');
    
    const submissionsResponse = await fetch('http://localhost:5000/api/project-submissions', {
      headers: {
        'Cookie': loginCookies
      },
      credentials: 'include'
    });
    
    if (!submissionsResponse.ok) {
      console.error('Failed to access project submissions:', submissionsResponse.status, submissionsResponse.statusText);
      const errorText = await submissionsResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const submissions = await submissionsResponse.json();
    console.log(`Successfully retrieved ${submissions.length} project submissions from API`);
    
    if (submissions.length > 0) {
      console.log('First submission from API:', submissions[0]);
    }
  } catch (error) {
    console.error('API testing error:', error);
    console.error('Error message:', error.message);
    if (error.stack) console.error('Stack trace:', error.stack);
  }
}

// Run tests
async function main() {
  await testDirectDbAccess();
  await testApiEndpoint();
  
  console.log('\n=== Project Submissions Debug Complete ===');
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});