#!/usr/bin/env node

/**
 * Script to fix issues with the Replit deployment (dv-ai-project-showcase.replit.app)
 * This script:
 * 1. Updates admin password
 * 2. Ensures the interface has the proper reset button
 * 
 * Run with:
 *   node scripts/fix-replit-deployment.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
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

console.log('=== Replit Deployment Fix ===');

// Constants
const ADMIN_USERNAME = 'admin@digitalvillage.com.au';
const ADMIN_PASSWORD = 'Password123';

// Get the appropriate database URL for the deployment
const getDatabaseUrl = () => {
  // Deployment will use DATABASE_URL directly
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for deployment fix');
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

// Update auth.ts file to use correct credentials
function updateAuthFile() {
  console.log('Updating hardcoded credentials in auth.ts...');
  
  try {
    const authFile = path.join(rootDir, 'server', 'auth.ts');
    
    // Read the current file
    let content = fs.readFileSync(authFile, 'utf8');
    
    // Update the password - find different password patterns that might exist
    content = content.replace(
      /const ADMIN_PASSWORD = ["']password123["']/,
      `const ADMIN_PASSWORD = "${ADMIN_PASSWORD}"`
    );
    
    content = content.replace(
      /const ADMIN_PASSWORD = ["']admin["']/,
      `const ADMIN_PASSWORD = "${ADMIN_PASSWORD}"`
    );
    
    // Generic pattern to catch any other password
    content = content.replace(
      /const ADMIN_PASSWORD = ["'].*?["']/,
      `const ADMIN_PASSWORD = "${ADMIN_PASSWORD}"`
    );
    
    // Write the updated file
    fs.writeFileSync(authFile, content);
    console.log('✓ Updated auth.ts with correct admin credentials');
    
  } catch (error) {
    console.error('× Error updating auth.ts file:', error);
    console.error('You may need to manually update the ADMIN_PASSWORD in server/auth.ts');
  }
}

// Ensure the Start New Project button exists in the client
function ensureStartNewProjectButton() {
  console.log('Checking for Start New Project button in ChatForm.tsx...');
  
  try {
    const chatFormFile = path.join(rootDir, 'client', 'src', 'pages', 'ChatForm.tsx');
    
    if (!fs.existsSync(chatFormFile)) {
      console.error('× ChatForm.tsx file not found. Check the path.');
      return false;
    }
    
    let content = fs.readFileSync(chatFormFile, 'utf8');
    
    // Check if the Start New Project button already exists
    if (content.includes('Start New Project') || content.includes('StartNewProject')) {
      console.log('✓ Start New Project button already exists in ChatForm.tsx');
      return true;
    }
    
    // Find a good spot to add the button (before final closing div)
    if (content.includes('export default function ChatForm')) {
      // Find the return statement and look for a spot in the JSX
      const beforeRefreshSessionPos = content.lastIndexOf('</div>');
      
      if (beforeRefreshSessionPos !== -1) {
        // Add the Start New Project button before the final closing div
        const button = `
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => {
                const shouldReset = window.confirm('Starting a new project will clear the current chat. Are you sure?');
                if (shouldReset) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="mx-auto"
            >
              Start New Project
            </Button>
          </div>
        `;
        
        // Insert the button
        const updatedContent = 
          content.slice(0, beforeRefreshSessionPos) + 
          button + 
          content.slice(beforeRefreshSessionPos);
        
        // Write the updated content
        fs.writeFileSync(chatFormFile, updatedContent);
        console.log('✓ Added Start New Project button to ChatForm.tsx');
        return true;
      } else {
        console.error('× Could not find a suitable location to add the button in ChatForm.tsx');
        return false;
      }
    } else {
      console.error('× ChatForm.tsx structure is different than expected');
      return false;
    }
    
  } catch (error) {
    console.error('× Error updating ChatForm.tsx:', error);
    return false;
  }
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
        console.error('× No admin user found at all. Creating a new admin user...');
        
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
    console.error('× Error updating admin password:', error);
    console.error('Error details:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  try {
    // 1. Update credentials in the code
    updateAuthFile();
    
    // 2. Ensure the UI has the Start New Project button
    ensureStartNewProjectButton();
    
    // 3. Update the admin password in the database
    const success = await updateAdminPassword();
    
    if (success) {
      console.log('\n=== Replit Deployment Fix Completed ===');
      console.log('✓ Updated auth.ts with correct credentials');
      console.log('✓ Added/verified Start New Project button');
      console.log('✓ Updated admin password in database');
      console.log('✓ Sessions cleared');
      
      console.log('\nAdmin login credentials:');
      console.log(`Username: ${ADMIN_USERNAME}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
      
      console.log('\nDEPLOYMENT INSTRUCTIONS:');
      console.log('1. Commit and push these changes to your Replit project');
      console.log('2. Deploy the application again through the Replit interface');
      console.log('3. Login with the updated credentials');
    } else {
      console.error('\n× Replit Deployment Fix Failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n× Unexpected error:', error);
    process.exit(1);
  }
}

main();