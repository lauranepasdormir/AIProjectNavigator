#!/usr/bin/env node

/**
 * Script to prepare the application for production
 * This script:
 * 1. Switches to production environment
 * 2. Builds the frontend
 * 3. Creates the necessary directory structure
 * 
 * Usage: 
 *   - node scripts/prepare-production.js
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Ensure we're running with proper Node flags
process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';

// Colors for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== Preparing for Production ====${colors.reset}\n`);

// Step 1: Switch to production environment
console.log(`${colors.yellow}Step 1: Switching to production environment...${colors.reset}`);
try {
  const switchEnvOutput = execSync('node scripts/switch-env.js prod', { encoding: 'utf8' });
  console.log(switchEnvOutput);
  console.log(`${colors.green}✓ Switched to production environment${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Failed to switch to production environment:${colors.reset}`, error.message);
  process.exit(1);
}

// Step 2: Update .env to ensure OpenAI API key is properly set
console.log(`${colors.yellow}Step 2: Updating environment variables...${colors.reset}`);
try {
  const envPath = path.join(rootDir, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Make sure NODE_ENV is set to production
  if (envContent.includes('NODE_ENV=')) {
    envContent = envContent.replace(/NODE_ENV=.*/g, 'NODE_ENV=production');
  } else {
    envContent = `NODE_ENV=production\n${envContent}`;
  }
  
  // Update the file
  fs.writeFileSync(envPath, envContent);
  console.log(`${colors.green}✓ Updated environment variables${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Failed to update environment variables:${colors.reset}`, error.message);
  process.exit(1);
}

// Step 3: Build the frontend
console.log(`${colors.yellow}Step 3: Building the frontend...${colors.reset}`);
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Frontend built successfully${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Failed to build frontend:${colors.reset}`, error.message);
  process.exit(1);
}

// Step 4: Ensure server/public directory exists for static files
console.log(`${colors.yellow}Step 4: Setting up static files directory...${colors.reset}`);
const publicDir = path.join(rootDir, 'server', 'public');
try {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log(`Created directory: ${publicDir}`);
  }
  
  // Copy dist files to server/public if they exist
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    // Simple function to copy directory recursively
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyDir(distDir, publicDir);
    console.log(`Copied build files from ${distDir} to ${publicDir}`);
  }
  
  console.log(`${colors.green}✓ Static files directory setup complete${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Failed to setup static files directory:${colors.reset}`, error.message);
  process.exit(1);
}

console.log(`${colors.bright}${colors.green}✓ Production preparation complete!${colors.reset}`);
console.log(`${colors.cyan}You can now run the application in production mode with:${colors.reset}`);
console.log(`${colors.bright}NODE_ENV=production tsx server/index.ts${colors.reset}`);