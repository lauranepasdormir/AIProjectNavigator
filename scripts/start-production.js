#!/usr/bin/env node

/**
 * Script to start the application in production mode
 * This script ensures the application is started with the correct environment variables
 * and configurations for production.
 * 
 * Usage: 
 *   - node scripts/start-production.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Colors for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== Starting Application in Production Mode ====${colors.reset}\n`);

// Step 1: Verify the server/public directory exists and has required files
console.log(`${colors.yellow}Step 1: Verifying server/public directory...${colors.reset}`);
const serverPublicDir = path.join(rootDir, 'server', 'public');
const indexHtmlPath = path.join(serverPublicDir, 'index.html');

if (!fs.existsSync(serverPublicDir) || !fs.existsSync(indexHtmlPath)) {
  console.error(`${colors.red}✗ Production build not found!${colors.reset}`);
  console.log(`${colors.yellow}Running build for production first...${colors.reset}`);
  
  try {
    execSync('node scripts/build-for-production.js', { stdio: 'inherit' });
  } catch (error) {
    console.error(`${colors.red}✗ Failed to build for production:${colors.reset}`, error.message);
    process.exit(1);
  }
} else {
  console.log(`${colors.green}✓ Production build found${colors.reset}\n`);
}

// Step 2: Ensure we're using the production database URL
console.log(`${colors.yellow}Step 2: Checking environment configuration...${colors.reset}`);
try {
  execSync('node scripts/set-env.js prod', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Environment configured for production${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Failed to configure environment:${colors.reset}`, error.message);
}

// Step 3: Start the application in production mode
console.log(`${colors.yellow}Step 3: Starting application...${colors.reset}`);
try {
  console.log(`${colors.bright}${colors.green}Starting server in production mode${colors.reset}`);
  
  // Execute command to start the server in production mode
  execSync('NODE_ENV=production tsx server/index.ts', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error(`${colors.red}✗ Failed to start application:${colors.reset}`, error.message);
  process.exit(1);
}