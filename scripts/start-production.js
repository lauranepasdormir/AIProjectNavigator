#!/usr/bin/env node

/**
 * Script to run the application in production mode
 * 
 * Usage: 
 *   - node scripts/start-production.js
 */

// Import required modules
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

// Make sure we're running in production mode
process.env.NODE_ENV = 'production';

// Update .env file to ensure it has NODE_ENV=production
try {
  const envPath = path.join(rootDir, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace NODE_ENV line or add it if it doesn't exist
  if (envContent.includes('NODE_ENV=')) {
    envContent = envContent.replace(/NODE_ENV=.*/g, 'NODE_ENV=production');
  } else {
    envContent = `NODE_ENV=production\n${envContent}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('Updated .env file with NODE_ENV=production');
} catch (err) {
  console.error('Error updating .env file:', err);
}

// Start the server using tsx (which is used for development)
// This still allows for TypeScript support without needing to build
console.log('Starting server in PRODUCTION mode...');
const server = spawn('tsx', ['server/index.ts'], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit'
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill('SIGINT');
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.kill('SIGTERM');
  process.exit();
});