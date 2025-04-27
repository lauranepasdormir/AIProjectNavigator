#!/usr/bin/env node

/**
 * Script to create or update .env file with appropriate database URLs
 * for different environments.
 * 
 * Usage: 
 *   - node scripts/set-env.js dev     # Configure for development
 *   - node scripts/set-env.js prod    # Configure for production
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get current env settings if they exist
let currentEnv = '';
try {
  if (fs.existsSync(envPath)) {
    currentEnv = fs.readFileSync(envPath, 'utf8');
  }
} catch (err) {
  console.error('Error reading .env file:', err);
}

// Parse command line argument
const args = process.argv.slice(2);
const envType = args[0] || 'dev'; // Default to dev if no argument provided

// Get environment variables
const databaseUrl = process.env.DATABASE_URL || '';

// Define the environment content based on environment type
let envContent;

if (envType.toLowerCase() === 'dev' || envType.toLowerCase() === 'development') {
  console.log('Configuring for DEVELOPMENT environment');
  envContent = `# Environment Variables
NODE_ENV=development

# Development database URL (this one takes precedence in development mode)
DEV_DATABASE_URL=${databaseUrl}

# Production database URL (this will be used in production)
# PROD_DATABASE_URL=your_production_db_url_here`;
} else if (envType.toLowerCase() === 'prod' || envType.toLowerCase() === 'production') {
  console.log('Configuring for PRODUCTION environment');
  envContent = `# Environment Variables
NODE_ENV=production

# Development database URL (only used in development mode)
# DEV_DATABASE_URL=your_development_db_url_here

# Production database URL (this will be used in production)
PROD_DATABASE_URL=${databaseUrl}`;
} else {
  console.error('Invalid environment type. Use "dev" or "prod".');
  process.exit(1);
}

// Write to .env file
fs.writeFileSync(envPath, envContent);
console.log(`.env file has been updated for ${envType.toLowerCase() === 'dev' || envType.toLowerCase() === 'development' ? 'development' : 'production'} environment.`);

// Exit
process.exit(0);