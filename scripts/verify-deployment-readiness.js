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

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== Verifying Deployment Readiness ====${colors.reset}\n`);

async function testEndpoint(endpoint, expectedResponse = null, maxResponseTime = 100) {
  console.log(`${colors.yellow}Testing ${endpoint}...${colors.reset}`);
  
  try {
    const startTime = performance.now();
    const response = await fetch(`http://localhost:5000${endpoint}`);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    const text = await response.text();
    const isOk = response.status === 200;
    const hasExpectedResponse = expectedResponse ? text === expectedResponse : true;
    const isResponseTimeFast = responseTime < maxResponseTime;
    
    if (isOk && hasExpectedResponse && isResponseTimeFast) {
      console.log(`${colors.green}✓ ${endpoint} responded with status 200 in ${responseTime.toFixed(2)}ms${colors.reset}`);
      if (expectedResponse) {
        console.log(`${colors.green}✓ Response body: "${text}" matches expected response${colors.reset}`);
      }
      return true;
    } else {
      if (!isOk) {
        console.error(`${colors.red}✗ ${endpoint} responded with status ${response.status}${colors.reset}`);
      }
      if (!hasExpectedResponse && expectedResponse) {
        console.error(`${colors.red}✗ Response body: "${text}" does not match expected: "${expectedResponse}"${colors.reset}`);
      }
      if (!isResponseTimeFast) {
        console.error(`${colors.red}✗ Response time ${responseTime.toFixed(2)}ms exceeds maximum ${maxResponseTime}ms${colors.reset}`);
      }
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Error testing ${endpoint}: ${error.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  let allPassed = true;
  
  // Test 1: Root endpoint should return "OK" immediately
  const rootResult = await testEndpoint('/', 'OK');
  allPassed = allPassed && rootResult;
  
  // Test 2: Health endpoint should return "OK" immediately
  const healthResult = await testEndpoint('/health', 'OK');
  allPassed = allPassed && healthResult;
  
  // Test 3: /app endpoint should serve the application (not checking content, just status)
  const appResult = await testEndpoint('/app', null, 1000); // Allow longer response time for app
  allPassed = allPassed && appResult;
  
  console.log('\n');
  if (allPassed) {
    console.log(`${colors.bright}${colors.green}✓ All tests passed! Application is ready for deployment${colors.reset}`);
    console.log(`${colors.cyan}You can deploy your application using the Replit Deployments feature.${colors.reset}`);
  } else {
    console.log(`${colors.bright}${colors.red}✗ Some tests failed. See above for details.${colors.reset}`);
    console.log(`${colors.yellow}Please fix the issues before attempting to deploy.${colors.reset}`);
  }
}

main().catch(err => {
  console.error(`${colors.red}Error running tests: ${err.message}${colors.reset}`);
  process.exit(1);
});