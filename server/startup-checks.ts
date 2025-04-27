import { pool } from "./db";

/**
 * Performs startup checks to ensure the database and session table are properly configured
 */
export async function performStartupChecks(): Promise<void> {
  try {
    console.log('Performing startup checks...');
    
    // Check if session table exists
    const client = await pool.connect();
    console.log('Database connection successful for startup checks');
    
    try {
      const tableResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'session'
        );
      `);
      
      const sessionTableExists = tableResult.rows[0].exists;
      
      if (sessionTableExists) {
        console.log('✓ Session table exists');
      } else {
        console.log('⚠️ Session table does not exist, creating it...');
        
        // Create session table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
          )
        `);
        
        // Create index for faster expiration queries
        await client.query(`
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);
        
        console.log('✓ Session table and index created successfully');
      }
      
      // Check project_submissions table
      const submissionsResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'project_submissions'
        );
      `);
      
      const projectSubmissionsExist = submissionsResult.rows[0].exists;
      
      if (projectSubmissionsExist) {
        console.log('✓ Project submissions table exists');
        
        // Check if we have any data
        const countResult = await client.query('SELECT COUNT(*) FROM project_submissions');
        console.log(`Found ${countResult.rows[0].count} project submissions in the database`);
      } else {
        console.log('⚠️ Project submissions table not found!');
      }
      
      // Check admin user
      const adminResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM users
          WHERE username = 'admin'
        );
      `);
      
      const adminExists = adminResult.rows[0].exists;
      
      if (adminExists) {
        console.log('✓ Admin user exists');
      } else {
        console.log('⚠️ Admin user does not exist, creating default admin...');
        
        // Admin doesn't exist, create it (password 'admin')
        await client.query(`
          INSERT INTO users (username, password, created_at)
          VALUES ('admin', '$2a$10$DpWxgz29EHpkFygaZk8KROEuXgkFe9tZQQKWY9NTxEf6n7md6rBbO', NOW())
        `);
        
        console.log('✓ Admin user created');
      }
      
      console.log('✓ Startup checks completed successfully');
    } catch (error) {
      console.error('Error during startup checks:', error);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to connect to database for startup checks:', error);
  }
}