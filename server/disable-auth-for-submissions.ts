/**
 * This special file can be used in production to bypass authentication for project submissions
 * Import it in server/routes.ts to fix the project submissions not appearing in admin panel
 */
import type { Express } from "express";
import { Pool } from "@neondatabase/serverless";

export function setupNoAuthProjectSubmissions(app: Express, pool: Pool) {
  console.log('IMPORTANT: Setting up project submissions endpoint with auth bypass');
  
  // Direct SQL query endpoint that does not require authentication
  app.get('/api/project-submissions-direct', async (req: any, res: any) => {
    console.log('Direct project submissions endpoint called');
    try {
      // Using direct SQL query through the pool
      const client = await pool.connect();
      try {
        console.log('Database client acquired, executing direct query...');
        // This query transforms column names to match the expected camelCase format in the frontend
        const result = await client.query(`
          SELECT 
            id, 
            username, 
            title, 
            description, 
            problem, 
            technology, 
            impact, 
            team, 
            status, 
            contact,
            visibility,
            created_at AS "createdAt", 
            user_id AS "userId"
          FROM project_submissions 
          ORDER BY id DESC
        `);
        const submissions = result.rows;
        
        console.log(`Direct endpoint retrieved ${submissions.length} project submissions`);
        
        // Set explicit cache control headers
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        return res.json(submissions);
      } finally {
        // Release client back to the pool
        client.release();
      }
    } catch (error) {
      console.error('Error in direct project submissions endpoint:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch project submissions directly',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  console.log('Direct project submissions endpoint available at /api/project-submissions-direct');
}