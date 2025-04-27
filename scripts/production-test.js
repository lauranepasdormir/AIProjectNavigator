#!/usr/bin/env node

/**
 * Script to run API tests against the currently running server
 * to verify functionality in the current environment.
 * 
 * Usage: 
 *   - node scripts/production-test.js
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

// Colors for prettier console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const baseUrl = 'http://localhost:5000';

async function testApi() {
  console.log(`${colors.bright}${colors.cyan}=== Testing API Endpoints ====${colors.reset}\n`);
  
  // Display current environment
  console.log(`${colors.yellow}Current environment: ${process.env.NODE_ENV}${colors.reset}`);
  
  // Test 1: Public Projects API
  console.log(`\n${colors.yellow}Test 1: Public Projects API${colors.reset}`);
  try {
    const response = await fetch(`${baseUrl}/api/public-projects`);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Found ${data.length} public projects`);
    console.log(`${colors.green}✓ Public Projects API working${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Public Projects API failed:${colors.reset}`, error.message);
  }
  
  // Test 2: Draft Suggestion API
  console.log(`\n${colors.yellow}Test 2: Draft Suggestion API${colors.reset}`);
  try {
    const response = await fetch(`${baseUrl}/api/draft-suggestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: 'What technologies does your project use?',
        context: { title: 'API Test Project' }
      })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      if (data.suggestion) {
        console.log(`Suggestion length: ${data.suggestion.length} characters`);
        console.log(`Suggestion preview: ${data.suggestion.substring(0, 50)}...`);
        console.log(`${colors.green}✓ Draft Suggestion API working${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ Draft Suggestion API returned success but no suggestion${colors.reset}`);
      }
    } else {
      console.error(`${colors.red}✗ Draft Suggestion API failed:${colors.reset}`, data.error);
      if (data.details) {
        console.error(`Error details:`, data.details);
      }
    }
  } catch (error) {
    console.error(`${colors.red}✗ Draft Suggestion API failed:${colors.reset}`, error.message);
  }
  
  console.log(`\n${colors.bright}${colors.cyan}=== API Tests Complete ====${colors.reset}`);
}

// Run the tests
testApi().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
});