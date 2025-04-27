#!/usr/bin/env node

/**
 * Script to build the application for production
 * This script builds the client application and copies the files to the correct location
 * for production serving.
 * 
 * Usage: 
 *   - node scripts/build-for-production.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
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

console.log(`${colors.bright}${colors.cyan}=== Building Application for Production ====${colors.reset}\n`);

// Step 1: Build the client application
console.log(`${colors.yellow}Step 1: Building the client application...${colors.reset}`);
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Client application built successfully${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Failed to build client application:${colors.reset}`, error.message);
  process.exit(1);
}

// Step 2: Ensure server/public directory exists
console.log(`${colors.yellow}Step 2: Setting up server/public directory...${colors.reset}`);
const serverPublicDir = path.join(rootDir, 'server', 'public');
try {
  if (!fs.existsSync(serverPublicDir)) {
    fs.mkdirSync(serverPublicDir, { recursive: true });
    console.log(`Created directory: ${serverPublicDir}`);
  } else {
    console.log(`Directory already exists: ${serverPublicDir}`);
  }
  console.log(`${colors.green}✓ Server/public directory setup complete${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Failed to setup server/public directory:${colors.reset}`, error.message);
  process.exit(1);
}

// Step 3: Copy dist files to server/public
console.log(`${colors.yellow}Step 3: Copying build files to server/public...${colors.reset}`);
try {
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
  
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    // If there's a public subdirectory, copy from that
    const distPublicDir = path.join(distDir, 'public');
    const sourceDir = fs.existsSync(distPublicDir) ? distPublicDir : distDir;
    
    copyDir(sourceDir, serverPublicDir);
    console.log(`Copied build files from ${sourceDir} to ${serverPublicDir}`);
  } else {
    console.error(`${colors.red}✗ Dist directory not found: ${distDir}${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✓ Build files copied successfully${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}✗ Failed to copy build files:${colors.reset}`, error.message);
  process.exit(1);
}

// Step 4: Verify the server/public directory has the index.html file
console.log(`${colors.yellow}Step 4: Verifying server/public directory contents...${colors.reset}`);
try {
  const indexHtmlPath = path.join(serverPublicDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    console.log(`${colors.green}✓ index.html found in server/public directory${colors.reset}`);
  } else {
    console.error(`${colors.red}✗ index.html not found in server/public directory${colors.reset}`);
    
    // Try to copy index.html from dist/index.html or client/index.html as a fallback
    const distIndexHtml = path.join(distDir, 'index.html');
    const clientIndexHtml = path.join(rootDir, 'client', 'index.html');
    
    if (fs.existsSync(distIndexHtml)) {
      fs.copyFileSync(distIndexHtml, indexHtmlPath);
      console.log(`${colors.yellow}Copied index.html from ${distIndexHtml} to ${indexHtmlPath}${colors.reset}`);
    } else if (fs.existsSync(clientIndexHtml)) {
      // If copying from client/index.html, we need to modify the script src
      let indexHtmlContent = fs.readFileSync(clientIndexHtml, 'utf8');
      indexHtmlContent = indexHtmlContent.replace(
        '<script type="module" src="/src/main.tsx"></script>',
        '<!-- Script tags will be injected by the build process -->'
      );
      fs.writeFileSync(indexHtmlPath, indexHtmlContent);
      console.log(`${colors.yellow}Created index.html in ${indexHtmlPath} from client template${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Could not find any index.html to copy${colors.reset}`);
    }
  }
} catch (error) {
  console.error(`${colors.red}✗ Failed to verify server/public directory:${colors.reset}`, error.message);
}

console.log(`\n${colors.bright}${colors.green}✓ Production build complete!${colors.reset}`);
console.log(`${colors.cyan}You can start the application in production mode with:${colors.reset}`);
console.log(`${colors.bright}NODE_ENV=production tsx server/index.ts${colors.reset}`);