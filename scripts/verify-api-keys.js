#!/usr/bin/env node

/**
 * Script to verify API keys and environment configuration
 * 
 * Usage: 
 *   - node scripts/verify-api-keys.js
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

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

async function verifyApiKeys() {
  console.log(`${colors.bright}${colors.cyan}=== Verifying API Keys ====${colors.reset}\n`);
  
  // Display current environment
  console.log(`${colors.yellow}Current environment: ${process.env.NODE_ENV || 'not set'}${colors.reset}`);
  
  // Check OpenAI API key
  console.log(`\n${colors.yellow}OpenAI API Key:${colors.reset}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.log(`${colors.red}✗ OPENAI_API_KEY is not set in environment${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ OPENAI_API_KEY is set in environment${colors.reset}`);
    
    // Try a basic API call to verify the key works
    try {
      console.log(`Testing OpenAI API connection...`);
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Make a simple models list call to verify API key
      const models = await openai.models.list();
      
      console.log(`${colors.green}✓ Successfully connected to OpenAI API${colors.reset}`);
      console.log(`Available models: ${models.data.length}`);
      
      // List a few models
      console.log('Sample of available models:');
      const sampleModels = models.data.slice(0, 5);
      sampleModels.forEach(model => {
        console.log(`- ${model.id}`);
      });
      
    } catch (error) {
      console.error(`${colors.red}✗ Failed to connect to OpenAI API:${colors.reset}`, error.message);
      if (error.response) {
        console.error('API Response:', error.response.data);
      }
    }
  }
  
  // Check database configuration
  console.log(`\n${colors.yellow}Database Configuration:${colors.reset}`);
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL && !process.env.DEV_DATABASE_URL && !process.env.PROD_DATABASE_URL) {
    console.log(`${colors.red}✗ No database URL is set in environment${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ Database URL is configured${colors.reset}`);
    
    // Report which database URL will be used in current environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      if (process.env.DEV_DATABASE_URL) {
        console.log(`Using DEV_DATABASE_URL for development environment`);
      } else if (process.env.DATABASE_URL) {
        console.log(`Using DATABASE_URL for development environment (DEV_DATABASE_URL not set)`);
      }
    } else {
      if (process.env.PROD_DATABASE_URL) {
        console.log(`Using PROD_DATABASE_URL for production environment`);
      } else if (process.env.DATABASE_URL) {
        console.log(`Using DATABASE_URL for production environment (PROD_DATABASE_URL not set)`);
      }
    }
  }
  
  console.log(`\n${colors.bright}${colors.cyan}=== Verification Complete ====${colors.reset}`);
}

// Run the verification
verifyApiKeys().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
});