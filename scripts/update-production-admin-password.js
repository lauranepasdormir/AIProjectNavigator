#!/usr/bin/env node

/**
 * Script to update the admin password in the production database
 * Usage:
 *   - node scripts/update-production-admin-password.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

// For production
process.env.NODE_ENV = 'production';

// Constants
const ADMIN_USERNAME = 'admin@digitalvillage.com.au';
const ADMIN_PASSWORD = 'Password123';

console.log('=== Production Admin Password Update ===');

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

const scryptAsync = promisify(scrypt);

// Hash password function (matching the one in auth.ts)
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
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

async function updateAdminPassword() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✓ Database connection successful');
    
    // Check for admin user
    console.log(`Checking for admin user with username: ${ADMIN_USERNAME}`);
    const adminResult = await client.query(`
      SELECT id, username, password
      FROM users
      WHERE username = $1
    `, [ADMIN_USERNAME]);
    
    if (adminResult.rows.length === 0) {
      console.log(`Admin user with username ${ADMIN_USERNAME} not found, checking for 'admin'...`);
      
      // Try 'admin' username as fallback
      const adminLegacyResult = await client.query(`
        SELECT id, username, password
        FROM users
        WHERE username = 'admin'
      `);
      
      if (adminLegacyResult.rows.length === 0) {
        console.error('❌ No admin user found at all. Creating a new admin user...');
        
        // Create admin user
        const hashedPassword = await hashPassword(ADMIN_PASSWORD);
        
        const createResult = await client.query(`
          INSERT INTO users (username, password, created_at)
          VALUES ($1, $2, NOW())
          RETURNING id
        `, [ADMIN_USERNAME, hashedPassword]);
        
        console.log(`✓ Admin user created with ID: ${createResult.rows[0].id}`);
      } else {
        console.log(`Found admin user with username 'admin'. Updating to ${ADMIN_USERNAME}...`);
        
        // Update the existing 'admin' user to use the email address
        const hashedPassword = await hashPassword(ADMIN_PASSWORD);
        
        await client.query(`
          UPDATE users
          SET username = $1, password = $2
          WHERE username = 'admin'
        `, [ADMIN_USERNAME, hashedPassword]);
        
        console.log(`✓ Admin user updated from 'admin' to ${ADMIN_USERNAME}`);
      }
    } else {
      console.log(`Admin user found with ID: ${adminResult.rows[0].id}`);
      
      // Update admin password
      console.log('Updating admin password...');
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);
      
      await client.query(`
        UPDATE users
        SET password = $1
        WHERE username = $2
      `, [hashedPassword, ADMIN_USERNAME]);
      
      console.log('✓ Admin password updated successfully');
    }
    
    // Clear any existing sessions to force fresh logins
    console.log('\nClearing existing sessions to ensure fresh authentication...');
    await client.query(`
      DELETE FROM session
    `);
    console.log('✓ All sessions cleared');
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
    console.error('Error details:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  try {
    const success = await updateAdminPassword();
    
    if (success) {
      console.log('\n=== Production Admin Password Update Completed ===');
      console.log('✓ Admin user verified/created');
      console.log('✓ Admin password updated');
      console.log('✓ Sessions cleared');
      
      console.log('\nAdmin login credentials:');
      console.log(`Username: ${ADMIN_USERNAME}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
      
      console.log('\nYou can now log in to the production admin panel.');
    } else {
      console.error('\n❌ Production Admin Password Update Failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();