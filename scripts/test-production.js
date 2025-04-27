#!/usr/bin/env node

/**
 * Script to test the application in production mode
 * This script:
 * 1. Builds the application for production
 * 2. Starts the server in production mode
 * 3. Tests various endpoints
 * 
 * Usage: 
 *   - node scripts/test-production.js
 */

import { exec, spawn } from 'child_process';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

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

console.log(`${colors.bright}${colors.cyan}=== Testing Application in Production Mode ====${colors.reset}\n`);

// Build the application for production
console.log(`${colors.yellow}Step 1: Building application for production...${colors.reset}`);
try {
  exec('node scripts/build-for-production.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`${colors.red}✗ Error building application: ${error.message}${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}✓ Application built for production${colors.reset}`);
    
    // Ensure the server/public directory is properly set up
    exec('node scripts/ensure-server-public.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`${colors.red}✗ Error setting up server/public: ${error.message}${colors.reset}`);
        process.exit(1);
      }
      
      console.log(`${colors.green}✓ Server/public directory properly configured${colors.reset}`);
      startProductionServer();
    });
  });
} catch (error) {
  console.error(`${colors.red}✗ Error building application: ${error.message}${colors.reset}`);
  process.exit(1);
}

function startProductionServer() {
  console.log(`\n${colors.yellow}Step 2: Starting server in production mode...${colors.reset}`);
  
  // Start the server with NODE_ENV=production
  const serverProcess = spawn('NODE_ENV=production', ['tsx', 'server/index.ts'], {
    shell: true,
    stdio: 'pipe'
  });
  
  let serverOutput = '';
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log(`${colors.cyan}${output}${colors.reset}`);
    
    // When we see that the server is running, run our tests
    if (output.includes('Server running at http://0.0.0.0:5000')) {
      setTimeout(() => {
        testEndpoints(serverProcess);
      }, 1000); // Give it a second to fully initialize
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.error(`${colors.red}${output}${colors.reset}`);
  });
  
  serverProcess.on('error', (error) => {
    console.error(`${colors.red}✗ Error starting server: ${error.message}${colors.reset}`);
    serverProcess.kill();
    process.exit(1);
  });
  
  // If the server doesn't start within 10 seconds, kill it
  const timeout = setTimeout(() => {
    console.error(`${colors.red}✗ Server failed to start within 10 seconds${colors.reset}`);
    console.log(`${colors.yellow}Server output:${colors.reset}\n${serverOutput}`);
    serverProcess.kill();
    process.exit(1);
  }, 10000);
  
  // Clear the timeout when the server starts
  serverProcess.stdout.on('data', (data) => {
    if (data.toString().includes('Server running at http://0.0.0.0:5000')) {
      clearTimeout(timeout);
    }
  });
}

async function testEndpoints(serverProcess) {
  console.log(`\n${colors.yellow}Step 3: Testing endpoints...${colors.reset}`);
  
  try {
    // Test 1: Health check endpoint
    console.log(`${colors.yellow}Testing /health endpoint...${colors.reset}`);
    const healthResponse = await fetch('http://localhost:5000/health');
    const healthText = await healthResponse.text();
    
    if (healthResponse.ok && healthText === 'OK') {
      console.log(`${colors.green}✓ Health check endpoint working properly${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Health check endpoint not working: ${healthResponse.status} ${healthText}${colors.reset}`);
    }
    
    // Test 2: Root endpoint with health check headers
    console.log(`${colors.yellow}Testing / endpoint with health check headers...${colors.reset}`);
    const rootHealthResponse = await fetch('http://localhost:5000/', {
      headers: {
        'Accept': 'application/json'
      }
    });
    const rootHealthText = await rootHealthResponse.text();
    
    if (rootHealthResponse.ok && rootHealthText === 'OK') {
      console.log(`${colors.green}✓ Root health check working properly${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Root health check not working: ${rootHealthResponse.status} ${rootHealthText}${colors.reset}`);
    }
    
    // Test 3: Root endpoint with browser headers
    console.log(`${colors.yellow}Testing / endpoint with browser headers...${colors.reset}`);
    const rootBrowserResponse = await fetch('http://localhost:5000/', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (rootBrowserResponse.ok && rootBrowserResponse.headers.get('content-type')?.includes('text/html')) {
      const rootBrowserText = await rootBrowserResponse.text();
      if (rootBrowserText.includes('<html') && rootBrowserText.includes('<body')) {
        console.log(`${colors.green}✓ Root browser request returns HTML${colors.reset}`);
      } else {
        console.error(`${colors.red}✗ Root browser request does not return valid HTML${colors.reset}`);
      }
    } else {
      console.error(`${colors.red}✗ Root browser request failed: ${rootBrowserResponse.status}${colors.reset}`);
    }
    
    // Test 4: /app endpoint
    console.log(`${colors.yellow}Testing /app endpoint...${colors.reset}`);
    const appResponse = await fetch('http://localhost:5000/app');
    
    if (appResponse.ok && appResponse.headers.get('content-type')?.includes('text/html')) {
      const appText = await appResponse.text();
      if (appText.includes('<html') && appText.includes('<body')) {
        console.log(`${colors.green}✓ /app endpoint returns HTML${colors.reset}`);
      } else {
        console.error(`${colors.red}✗ /app endpoint does not return valid HTML${colors.reset}`);
      }
    } else {
      console.error(`${colors.red}✗ /app endpoint request failed: ${appResponse.status}${colors.reset}`);
    }
    
    // Test 5: Static assets
    console.log(`${colors.yellow}Testing access to static assets...${colors.reset}`);
    const cssResponse = await fetch('http://localhost:5000/assets/index-Br4EPqqh.css');
    
    if (cssResponse.ok && cssResponse.headers.get('content-type')?.includes('text/css')) {
      console.log(`${colors.green}✓ Static assets (CSS) are accessible${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Static assets request failed: ${cssResponse.status}${colors.reset}`);
    }
    
    console.log(`\n${colors.green}${colors.bright}✓ All production tests completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error during testing: ${error.message}${colors.reset}`);
  } finally {
    // Kill the server process
    console.log(`\n${colors.yellow}Shutting down test server...${colors.reset}`);
    serverProcess.kill();
    console.log(`${colors.green}✓ Server process terminated${colors.reset}`);
    console.log(`\n${colors.bright}${colors.cyan}=== Production Testing Complete ====${colors.reset}`);
  }
}