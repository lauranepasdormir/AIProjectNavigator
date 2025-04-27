/**
 * Script to test the direct project submissions endpoint
 * This script:
 * 1. Calls the direct endpoint that bypasses authentication
 * 2. Verifies that data is returned correctly
 * 
 * Usage: 
 *   - node scripts/test-direct-endpoint.js
 */

const fetch = require('node-fetch');

async function testDirectEndpoint() {
  console.log('Testing direct project submissions endpoint...');
  try {
    const response = await fetch('http://localhost:5000/api/project-submissions-direct', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error('Error response from direct endpoint');
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }

    const data = await response.json();
    
    console.log(`Successfully retrieved ${data.length} project submissions`);
    
    if (data.length > 0) {
      console.log('Sample submission:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('Error testing direct endpoint:', error);
    return false;
  }
}

async function main() {
  const success = await testDirectEndpoint();
  
  if (success) {
    console.log('✓ Direct endpoint test successful');
  } else {
    console.log('✗ Direct endpoint test failed');
    process.exit(1);
  }
}

main();