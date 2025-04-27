#!/usr/bin/env node

/**
 * Script to ensure the server/public directory is correctly set up
 * This script:
 * 1. Ensures server/public exists
 * 2. Copies any built files from dist/public to server/public
 * 3. Ensures all essential files are present in server/public
 * 
 * Usage: 
 *   - node scripts/ensure-server-public.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cpSync, existsSync, mkdirSync } from 'fs';

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

console.log(`${colors.bright}${colors.cyan}=== Ensuring Server Public Directory ====${colors.reset}\n`);

// Step 1: Ensure server/public directory exists
console.log(`${colors.yellow}Step 1: Checking server/public directory...${colors.reset}`);
const serverPublicDir = path.join(rootDir, 'server', 'public');

if (!existsSync(serverPublicDir)) {
  console.log(`${colors.yellow}Creating server/public directory...${colors.reset}`);
  try {
    mkdirSync(serverPublicDir, { recursive: true });
    console.log(`${colors.green}✓ Created server/public directory${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error creating server/public directory: ${error.message}${colors.reset}`);
    process.exit(1);
  }
} else {
  console.log(`${colors.green}✓ server/public directory exists${colors.reset}`);
}

// Step 2: Check for built files in dist/public
console.log(`\n${colors.yellow}Step 2: Checking for built files in dist/public...${colors.reset}`);
const distPublicDir = path.join(rootDir, 'dist', 'public');

if (existsSync(distPublicDir)) {
  console.log(`${colors.green}✓ dist/public directory found${colors.reset}`);
  console.log(`${colors.yellow}Copying files from dist/public to server/public...${colors.reset}`);
  
  try {
    cpSync(distPublicDir, serverPublicDir, { recursive: true, force: true });
    console.log(`${colors.green}✓ Copied built files to server/public${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error copying files: ${error.message}${colors.reset}`);
  }
} else {
  console.log(`${colors.yellow}! No dist/public directory found.${colors.reset}`);
  console.log(`${colors.yellow}! You may need to run the build script first.${colors.reset}`);
}

// Step 3: Ensure essential files exist in server/public
console.log(`\n${colors.yellow}Step 3: Verifying essential files in server/public...${colors.reset}`);
const essentialFiles = ['index.html'];
const missingFiles = [];

for (const file of essentialFiles) {
  const filePath = path.join(serverPublicDir, file);
  if (!existsSync(filePath)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length === 0) {
  console.log(`${colors.green}✓ All essential files found in server/public${colors.reset}`);
} else {
  console.log(`${colors.red}✗ Missing essential files in server/public: ${missingFiles.join(', ')}${colors.reset}`);
  
  // If index.html is missing, create a very basic one
  if (missingFiles.includes('index.html')) {
    console.log(`${colors.yellow}Creating basic index.html in server/public...${colors.reset}`);
    const basicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DigitalVitals Showcase</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>DigitalVitals Showcase</h1>
    <p>The application is working, but the frontend build is missing.</p>
    <p>Please run <code>node scripts/build-for-production.js</code> to build the client application.</p>
  </div>
</body>
</html>`;
    
    try {
      fs.writeFileSync(path.join(serverPublicDir, 'index.html'), basicHtml);
      console.log(`${colors.green}✓ Created basic index.html${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Error creating index.html: ${error.message}${colors.reset}`);
    }
  }
}

// Check if assets directory exists
const assetsDir = path.join(serverPublicDir, 'assets');
if (!existsSync(assetsDir)) {
  console.log(`${colors.yellow}! Assets directory missing in server/public${colors.reset}`);
  console.log(`${colors.yellow}Creating assets directory...${colors.reset}`);
  try {
    mkdirSync(assetsDir, { recursive: true });
    console.log(`${colors.green}✓ Created assets directory${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error creating assets directory: ${error.message}${colors.reset}`);
  }
}

// Copy any client public assets to server/public
console.log(`\n${colors.yellow}Step 4: Copying client public assets...${colors.reset}`);
const clientPublicDir = path.join(rootDir, 'client', 'public');

if (existsSync(clientPublicDir)) {
  console.log(`${colors.green}✓ client/public directory found${colors.reset}`);
  console.log(`${colors.yellow}Copying files from client/public to server/public...${colors.reset}`);
  
  try {
    const files = fs.readdirSync(clientPublicDir);
    for (const file of files) {
      const sourcePath = path.join(clientPublicDir, file);
      const destPath = path.join(serverPublicDir, file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`${colors.green}✓ Copied ${file} to server/public${colors.reset}`);
      }
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error copying client public files: ${error.message}${colors.reset}`);
  }
} else {
  console.log(`${colors.yellow}! No client/public directory found${colors.reset}`);
}

console.log(`\n${colors.bright}${colors.cyan}=== Server Public Directory Setup Complete ====${colors.reset}`);