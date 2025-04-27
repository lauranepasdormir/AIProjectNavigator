#!/usr/bin/env node

/**
 * Script to verify that the application is ready for deployment
 * This script checks that:
 * 1. The root endpoint responds immediately with "OK"
 * 2. The health endpoint responds immediately with "OK" 
 * 3. The /app endpoint serves the full application
 * 
 * Usage: 
 *   - node scripts/verify-deployment-readiness.js
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

console.log('=== Deployment Readiness Check ===');

async function testEndpoint(endpoint, expectedResponse = null, maxResponseTime = 100) {
  const url = `http://localhost:5000${endpoint}`;
  console.log(`Testing endpoint: ${url}`);
  
  try {
    const startTime = performance.now();
    
    // Set proper headers for health checks
    let headers = {};
    if (endpoint === '/') {
      headers = { 
        'Accept': 'application/json', 
        'User-Agent': 'deployment-check',
        // Make sure we use application/json Content-Type as well
        'Content-Type': 'application/json'
      };
    }
    
    const response = await fetch(url, { headers });
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    let content = null;
    
    if (expectedResponse) {
      content = await response.text();
    }
    
    const success = 
      response.status === 200 && 
      (expectedResponse === null || content === expectedResponse);
    
    if (success) {
      console.log(`✓ ${endpoint} - Status: ${response.status}, Response time: ${responseTime}ms`);
      if (expectedResponse) {
        console.log(`  Response content matches expected: "${expectedResponse}"`);
      }
    } else {
      console.log(`✗ ${endpoint} - Status: ${response.status}, Response time: ${responseTime}ms`);
      if (expectedResponse) {
        console.log(`  Expected: "${expectedResponse}"`);
        console.log(`  Received: "${content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'no content'}"`);
      }
    }
    
    // Additional check for response time
    if (responseTime > maxResponseTime) {
      console.log(`! Warning: Response time for ${endpoint} is slow (${responseTime}ms > ${maxResponseTime}ms)`);
    }
    
    return { 
      success, 
      status: response.status, 
      responseTime, 
      content
    };
  } catch (error) {
    console.log(`✗ Error connecting to ${endpoint}: ${error.message}`);
    return { 
      success: false, 
      error: error.message
    };
  }
}

async function main() {
  let allPassed = true;
  
  // 1. Test root endpoint (should respond with "OK" for health checkers)
  const rootResult = await testEndpoint('/', 'OK');
  if (!rootResult.success) {
    allPassed = false;
    console.log('! The root endpoint should respond with "OK" for non-browser requests');
    console.log('  This is important for health checks in the Replit deployment environment');
  }
  
  // 2. Test health endpoint
  const healthResult = await testEndpoint('/health', 'OK');
  if (!healthResult.success) {
    allPassed = false;
    console.log('! The /health endpoint should respond with "OK"');
    console.log('  This is a standard health check endpoint for monitoring tools');
  }
  
  // 3. Test replit-deploy-health endpoint
  const replitHealthResult = await testEndpoint('/replit-deploy-health', 'OK');
  if (!replitHealthResult.success) {
    allPassed = false;
    console.log('! The /replit-deploy-health endpoint should respond with "OK"');
    console.log('  This endpoint is specifically for Replit deployment health checks');
  }
  
  // 4. Verify app route
  const appResult = await testEndpoint('/app');
  if (!appResult.success) {
    allPassed = false;
    console.log('! The /app endpoint should serve the full application');
  }
  
  // 5. Test API authentication endpoint
  const authResult = await testEndpoint('/api/auth-status');
  console.log('Note: The auth-status endpoint returning 401 Unauthorized is expected if not logged in');
  
  // Print summary
  console.log('\n=== Deployment Readiness Summary ===');
  if (allPassed) {
    console.log('✓ All deployment readiness checks passed!');
    console.log('  Your application is ready for deployment.');
  } else {
    console.log('✗ Some deployment readiness checks failed!');
    console.log('  Please fix the issues noted above before deploying.');
  }
}

main().catch(error => {
  console.error('Error during deployment readiness check:', error);
  process.exit(1);
});