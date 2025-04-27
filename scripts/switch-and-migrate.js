#!/usr/bin/env node

/**
 * Script to switch environments and run migrations in one step.
 * 
 * Usage: 
 *   - node scripts/switch-and-migrate.js dev    # Switch to dev environment and run migrations
 *   - node scripts/switch-and-migrate.js prod   # Switch to prod environment and run migrations
 */

import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Get the environment from command line arguments
const args = process.argv.slice(2);
const env = args[0]?.toLowerCase();

if (!env || (env !== 'dev' && env !== 'prod')) {
  console.error('Please specify an environment: dev or prod');
  console.error('Usage: node switch-and-migrate.js <env>');
  process.exit(1);
}

console.log(`Switching to ${env === 'dev' ? 'development' : 'production'} environment...`);

// First, switch the environment
exec(`node ${path.join(__dirname, 'switch-env.js')} ${env}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error switching environment: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  
  console.log(stdout);
  
  // Set the NODE_ENV environment variable for the migration
  const nodeEnv = env === 'dev' ? 'development' : 'production';
  
  console.log('Running database migrations...');
  
  // Then run the migrations with the appropriate NODE_ENV
  exec(`NODE_ENV=${nodeEnv} node ${path.join(__dirname, 'db-migrate.js')}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running migrations: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    
    console.log(stdout);
    console.log(`Successfully switched to ${env === 'dev' ? 'development' : 'production'} environment and ran migrations.`);
  });
});