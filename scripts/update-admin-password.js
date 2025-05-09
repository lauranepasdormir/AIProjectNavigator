/**
 * Script to update the admin password in the database
 * This creates a properly hashed password and updates it for the admin user
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { promisify } from 'util';
import { scrypt, randomBytes } from 'crypto';
import dotenv from 'dotenv';
import ws from 'ws';

// Configure Neon to use the ws package for WebSocket connections
neonConfig.webSocketConstructor = ws;

dotenv.config();
const scryptAsync = promisify(scrypt);

// Function to generate a hashed password
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function updateAdminPassword() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      const newPassword = 'Password123'; // The new admin password
      console.log(`Hashing password for admin@digitalvillage.com.au...`);
      
      // Hash the password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the admin user's password
      console.log('Updating admin password in database...');
      const result = await client.query(
        'UPDATE users SET password = $1 WHERE username = $2 RETURNING id',
        [hashedPassword, 'admin@digitalvillage.com.au']
      );
      
      if (result.rowCount === 1) {
        console.log(`✅ Successfully updated password for admin@digitalvillage.com.au (ID: ${result.rows[0].id})`);
        console.log(`New login credentials will be:`);
        console.log(`- Username: admin@digitalvillage.com.au`);
        console.log(`- Password: ${newPassword}`);
        console.log('These credentials will work on both development and production environments.');
      } else {
        console.error('❌ Failed to update admin password. User not found.');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
updateAdminPassword().catch(console.error);