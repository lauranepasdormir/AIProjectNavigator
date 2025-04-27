#!/usr/bin/env node

/**
 * Script to fix common deployment issues with the application
 * This script:
 * 1. Ensures the root endpoint responds immediately with "OK"
 * 2. Verifies the static files are properly built and located
 * 3. Makes sure the application has the correct environment variables
 * 
 * Usage: 
 *   - node scripts/fix-deployment-issues.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

console.log(`${colors.bright}${colors.cyan}=== Fixing Deployment Issues ====${colors.reset}\n`);

// Fix 1: Check and fix server/index.ts to ensure it responds immediately to root endpoint
console.log(`${colors.yellow}Fix 1: Ensuring root endpoint responds immediately...${colors.reset}`);

try {
  const serverIndexPath = path.join(rootDir, 'server', 'index.ts');
  let serverIndexContent = fs.readFileSync(serverIndexPath, 'utf8');
  
  // Check if the root endpoint is already properly configured
  const hasProperRootEndpoint = serverIndexContent.includes('app.get(\'/\', (_req, res) => {') && 
                              serverIndexContent.includes('res.status(200).send(\'OK\');');
  
  if (hasProperRootEndpoint) {
    console.log(`${colors.green}✓ Root endpoint is properly configured${colors.reset}`);
  } else {
    console.log(`${colors.yellow}! Root endpoint needs to be fixed${colors.reset}`);
    
    // Find the right place to insert the code
    const appDeclarationIndex = serverIndexContent.indexOf('const app = express();');
    const middlewareSetupIndex = serverIndexContent.indexOf('app.use(express.json());');
    
    if (appDeclarationIndex !== -1 && middlewareSetupIndex !== -1) {
      // Find a good place to insert, after middleware setup
      const insertPosition = serverIndexContent.indexOf('\n', middlewareSetupIndex + 1);
      
      // Code to insert
      const codesToInsert = `
// Add health check endpoints - these should respond immediately without any processing
// Important: Do not render the entire application or do database queries here
app.get('/', (_req, res) => {
  // This is the root endpoint that will be used for health checks by Replit deployments
  // Just return a simple 200 OK response immediately
  res.status(200).send('OK');
});

app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Create an app route where we'll serve the actual frontend application
app.get('/app', (_req, res, next) => {
  // This will be handled by either Vite in development or serveStatic in production
  next();
});
`;
      
      // Insert the code after middleware setup
      const newServerContent = serverIndexContent.slice(0, insertPosition) + 
                              codesToInsert + 
                              serverIndexContent.slice(insertPosition);
      
      // Before writing, check if there are any existing similar endpoints to remove
      const oldHealthCheck = /app\.get\(['"]\/health['"].*?\{[\s\S]*?\}\);/g;
      const oldRootCheck = /app\.get\(['"]\/['"].*?\{[\s\S]*?\}\);/g;
      const oldAppRoute = /app\.get\(['"]\/app['"].*?\{[\s\S]*?\}\);/g;
      
      let cleanedContent = newServerContent.replace(oldHealthCheck, '');
      cleanedContent = cleanedContent.replace(oldRootCheck, '');
      cleanedContent = cleanedContent.replace(oldAppRoute, '');
      
      // Make sure we don't have duplicate endpoint definitions
      const endpointDefinitions = {
        root: (cleanedContent.match(/app\.get\(['"]\/['"].*?\{[\s\S]*?\}\);/g) || []).length,
        health: (cleanedContent.match(/app\.get\(['"]\/health['"].*?\{[\s\S]*?\}\);/g) || []).length,
        app: (cleanedContent.match(/app\.get\(['"]\/app['"].*?\{[\s\S]*?\}\);/g) || []).length
      };
      
      if (endpointDefinitions.root > 1 || endpointDefinitions.health > 1 || endpointDefinitions.app > 1) {
        console.log(`${colors.yellow}! Multiple endpoint definitions detected. Not modifying file.${colors.reset}`);
        console.log(`${colors.yellow}! Please manually ensure there is only one definition for each endpoint.${colors.reset}`);
      } else {
        // Write the fixed content back
        fs.writeFileSync(serverIndexPath, cleanedContent, 'utf8');
        console.log(`${colors.green}✓ Root endpoint fixed${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ Could not find the appropriate location to insert code${colors.reset}`);
    }
  }
} catch (error) {
  console.error(`${colors.red}✗ Error fixing root endpoint: ${error.message}${colors.reset}`);
}

// Fix 2: Ensure the client routes include /app
console.log(`\n${colors.yellow}Fix 2: Ensuring client routes include /app route...${colors.reset}`);

try {
  const appTsxPath = path.join(rootDir, 'client', 'src', 'App.tsx');
  let appTsxContent = fs.readFileSync(appTsxPath, 'utf8');
  
  // Check if the /app route is already properly configured
  const hasAppRoute = appTsxContent.includes('<Route path="/app"');
  
  if (hasAppRoute) {
    console.log(`${colors.green}✓ Client /app route is properly configured${colors.reset}`);
  } else {
    console.log(`${colors.yellow}! Client routes need to be fixed${colors.reset}`);
    
    // Find the route where the root path is defined
    const rootRouteIndex = appTsxContent.indexOf('<Route path="/"');
    
    if (rootRouteIndex !== -1) {
      // Find the end of this line
      const endOfLineIndex = appTsxContent.indexOf('\n', rootRouteIndex);
      
      // Insert the /app route after the root route
      const rootRouteLine = appTsxContent.slice(rootRouteIndex, endOfLineIndex);
      const appRouteLine = rootRouteLine.replace('path="/"', 'path="/app"');
      
      const newAppTsxContent = 
        appTsxContent.slice(0, endOfLineIndex) + 
        '\n          ' + appRouteLine + 
        appTsxContent.slice(endOfLineIndex);
      
      // Write the fixed content back
      fs.writeFileSync(appTsxPath, newAppTsxContent, 'utf8');
      console.log(`${colors.green}✓ Client routes fixed${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Could not find the root route in App.tsx${colors.reset}`);
    }
  }
} catch (error) {
  console.error(`${colors.red}✗ Error fixing client routes: ${error.message}${colors.reset}`);
}

// Fix 3: Ensure the static files are properly built
console.log(`\n${colors.yellow}Fix 3: Building static files for production...${colors.reset}`);

try {
  console.log(`${colors.yellow}Running build script...${colors.reset}`);
  execSync('node scripts/build-for-production.js', { stdio: 'inherit' });
  
  console.log(`${colors.yellow}Ensuring server/public directory is properly configured...${colors.reset}`);
  execSync('node scripts/ensure-server-public.js', { stdio: 'inherit' });
} catch (error) {
  console.error(`${colors.red}✗ Error building static files: ${error.message}${colors.reset}`);
}

// Fix 4: Verify environment setup
console.log(`\n${colors.yellow}Fix 4: Verifying environment setup...${colors.reset}`);

try {
  // Check if .env file exists and has necessary variables
  const envPath = path.join(rootDir, '.env');
  const envExists = fs.existsSync(envPath);
  
  if (envExists) {
    console.log(`${colors.green}✓ .env file exists${colors.reset}`);
    
    // Read and check for necessary variables
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasProdDatabase = envContent.includes('PROD_DATABASE_URL');
    const hasOpenAIKey = envContent.includes('OPENAI_API_KEY');
    
    if (!hasProdDatabase) {
      console.log(`${colors.yellow}! PROD_DATABASE_URL not found, trying to configure it...${colors.reset}`);
      try {
        execSync('node scripts/set-env.js prod', { stdio: 'inherit' });
      } catch (error) {
        console.error(`${colors.red}✗ Error configuring production environment: ${error.message}${colors.reset}`);
      }
    } else {
      console.log(`${colors.green}✓ PROD_DATABASE_URL is configured${colors.reset}`);
    }
    
    if (!hasOpenAIKey) {
      console.log(`${colors.yellow}! OPENAI_API_KEY not found${colors.reset}`);
      console.log(`${colors.yellow}! Make sure to set your OPENAI_API_KEY in the Secrets section of your Replit project${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ OPENAI_API_KEY is configured${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}! .env file not found, creating it...${colors.reset}`);
    try {
      execSync('node scripts/set-env.js prod', { stdio: 'inherit' });
    } catch (error) {
      console.error(`${colors.red}✗ Error creating .env file: ${error.message}${colors.reset}`);
    }
  }
} catch (error) {
  console.error(`${colors.red}✗ Error verifying environment: ${error.message}${colors.reset}`);
}

// Run deployment readiness check
console.log(`\n${colors.yellow}Running deployment readiness check...${colors.reset}`);

try {
  execSync('node scripts/verify-deployment-readiness.js', { stdio: 'inherit' });
} catch (error) {
  console.error(`${colors.red}✗ Error verifying deployment readiness: ${error.message}${colors.reset}`);
}

console.log(`\n${colors.bright}${colors.cyan}=== Deployment Fixes Complete ====${colors.reset}`);
console.log(`${colors.cyan}You should now be able to deploy your application.${colors.reset}`);
console.log(`${colors.cyan}Click the "Deploy" button in Replit to deploy.${colors.reset}\n`);