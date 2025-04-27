#!/usr/bin/env node

/**
 * Script to switch between development and production environments
 * 
 * Usage: 
 *   - node scripts/switch-env.js dev   # Switch to development environment
 *   - node scripts/switch-env.js prod  # Switch to production environment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line argument
const args = process.argv.slice(2);
const envType = args[0] || 'dev'; // Default to dev if no argument provided

// File paths
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const devTemplatePath = path.join(rootDir, '.env');
const prodTemplatePath = path.join(rootDir, '.prod', '.env.prod.template');

// Function to copy template to .env
function copyEnvTemplate(templatePath, targetPath) {
  try {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    fs.writeFileSync(targetPath, templateContent);
    return true;
  } catch (err) {
    console.error(`Error copying environment template: ${err.message}`);
    return false;
  }
}

// Switch environment based on command line argument
if (envType.toLowerCase() === 'dev' || envType.toLowerCase() === 'development') {
  console.log('Switching to DEVELOPMENT environment...');
  
  // Check if development .env exists and copy it
  if (fs.existsSync(devTemplatePath)) {
    // Backup current .env first if it exists
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, `${envPath}.backup`);
      console.log('Backed up current .env file to .env.backup');
    }
    
    // Set NODE_ENV in .env to development
    let envContent = fs.readFileSync(devTemplatePath, 'utf8');
    envContent = envContent.replace(/NODE_ENV=.*/g, 'NODE_ENV=development');
    fs.writeFileSync(envPath, envContent);
    
    console.log('Switched to development environment successfully.');
  } else {
    console.error('Development environment template not found.');
    process.exit(1);
  }
} else if (envType.toLowerCase() === 'prod' || envType.toLowerCase() === 'production') {
  console.log('Switching to PRODUCTION environment...');
  
  // Check if production template exists
  if (fs.existsSync(prodTemplatePath)) {
    // Backup current .env first if it exists
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, `${envPath}.backup`);
      console.log('Backed up current .env file to .env.backup');
    }
    
    // Copy production template to .env
    if (copyEnvTemplate(prodTemplatePath, envPath)) {
      console.log('Switched to production environment successfully.');
    }
  } else {
    console.error('Production environment template not found.');
    process.exit(1);
  }
} else {
  console.error('Invalid environment type. Use "dev" or "prod".');
  process.exit(1);
}

console.log('To apply changes, restart the application with: npm run dev');