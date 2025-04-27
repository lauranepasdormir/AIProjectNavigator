#!/usr/bin/env node

/**
 * Script to fix API routes for production
 * This script adds CORS headers, improves error handling and fixes authentication issues
 * 
 * Usage: 
 *   - node scripts/fix-api-routes.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== API Routes Fix ===');

// Path to the routes.ts file
const routesFilePath = path.join(rootDir, 'server', 'routes.ts');

// Updates to make to the routes.ts file
const updates = [
  {
    description: 'Add CORS headers to API responses',
    findCode: 'export async function registerRoutes(app: Express): Promise<Server> {',
    replaceCode: 'export async function registerRoutes(app: Express): Promise<Server> {\n  // Add CORS headers for API requests\n  app.use((req, res, next) => {\n    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");\n    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");\n    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");\n    res.header("Access-Control-Allow-Credentials", "true");\n    if (req.method === "OPTIONS") {\n      return res.status(200).end();\n    }\n    next();\n  });\n'
  },
  {
    description: 'Improve error handling for project submissions endpoint',
    findCode: `  app.get('/api/project-submissions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Fetching all project submissions...');
      const submissions = await storage.getAllProjectSubmissions();
      console.log(\`Retrieved \${submissions.length} project submissions:\`, 
        submissions.map(s => ({ id: s.id, title: s.title })));
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching project submissions:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        error: 'Failed to fetch project submissions',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });`,
    replaceCode: `  app.get('/api/project-submissions', isAuthenticated, async (req: Request, res: Response) => {
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        console.log(\`Fetching all project submissions (attempt \${retries + 1}/\${maxRetries})...\`);
        
        // Add a detailed log about the authentication
        console.log('User authentication:', req.isAuthenticated() ? 'Authenticated' : 'Not authenticated');
        if (req.user) {
          console.log('User details:', req.user);
        }
        
        const submissions = await storage.getAllProjectSubmissions();
        console.log(\`Retrieved \${submissions.length} project submissions:\`, 
          submissions.map(s => ({ id: s.id, title: s.title })));
        
        // Set explicit cache control headers
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        return res.json(submissions);
      } catch (error) {
        retries++;
        console.error(\`Error fetching project submissions (attempt \${retries}/\${maxRetries}):\`, error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        
        if (retries >= maxRetries) {
          console.error('Maximum retries reached, returning error response');
          return res.status(500).json({ 
            error: 'Failed to fetch project submissions',
            message: error instanceof Error ? error.message : 'Unknown error',
            retried: true,
            maxRetries
          });
        }
        
        // Add exponential backoff
        const delay = Math.pow(2, retries) * 500; // 1s, 2s, 4s
        console.log(\`Retrying in \${delay}ms...\`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  });`
  },
  {
    description: 'Update authentication check',
    findCode: 'app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {',
    replaceCode: '  // Add a route to test authentication status\n  app.get("/api/auth-status", isAuthenticated, (req, res) => {\n    res.json({\n      authenticated: true,\n      user: req.user\n    });\n  });\n\n  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {'
  }
];

// Read the current file content
console.log(`Reading current routes file: ${routesFilePath}`);
let fileContent = fs.readFileSync(routesFilePath, 'utf8');

// Apply each update
let anyUpdatesApplied = false;
updates.forEach(update => {
  if (fileContent.includes(update.findCode)) {
    console.log(`Applying update: ${update.description}`);
    fileContent = fileContent.replace(update.findCode, update.replaceCode);
    anyUpdatesApplied = true;
  } else {
    console.log(`⚠️ Could not apply update: ${update.description}`);
    console.log('The expected code pattern was not found in the file.');
  }
});

if (anyUpdatesApplied) {
  // Backup the original file
  const backupPath = `${routesFilePath}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, fs.readFileSync(routesFilePath));
  console.log(`✓ Created backup of original file: ${backupPath}`);
  
  // Write the updated content
  fs.writeFileSync(routesFilePath, fileContent);
  console.log(`✓ Updated routes file with API fixes`);
} else {
  console.log('No updates were applied to the routes file.');
}

// Now fix client-side API client
const queryClientPath = path.join(rootDir, 'client', 'src', 'lib', 'queryClient.ts');

console.log(`\nChecking client API client: ${queryClientPath}`);
if (fs.existsSync(queryClientPath)) {
  let clientContent = fs.readFileSync(queryClientPath, 'utf8');
  
  // Update client queryClient configuration
  if (clientContent.includes('defaultOptions: {')) {
    console.log('Updating client-side API client configuration');
    
    // Backup the original file
    const backupPath = `${queryClientPath}.backup-${Date.now()}`;
    fs.writeFileSync(backupPath, clientContent);
    console.log(`✓ Created backup of original client file: ${backupPath}`);
    
    // Check for and update retry settings
    if (clientContent.includes('retry: false')) {
      clientContent = clientContent.replace('retry: false', 'retry: 3');
      console.log('✓ Updated retry setting to allow 3 attempts');
    }
    
    // Update query cache time
    if (clientContent.includes('staleTime: Infinity')) {
      clientContent = clientContent.replace('staleTime: Infinity', 'staleTime: 30000, // 30 seconds');
      console.log('✓ Updated staleTime setting to 30 seconds instead of Infinity');
    }
    
    // Update refetch settings
    if (clientContent.includes('refetchInterval: false')) {
      clientContent = clientContent.replace('refetchInterval: false', 'refetchInterval: 30000, // 30 seconds');
      console.log('✓ Enabled periodic refetching every 30 seconds');
    }
    
    // Save updated file
    fs.writeFileSync(queryClientPath, clientContent);
    console.log('✓ Updated client API configuration');
  } else {
    console.log('⚠️ Could not find defaultOptions section in queryClient.ts');
  }
} else {
  console.log('⚠️ Could not find client API client file');
}

console.log('\n=== API Routes Fix Completed ===');
console.log('The API routes have been updated with improved error handling and retry mechanisms.');
console.log('This should fix the admin panel database connection issues.');