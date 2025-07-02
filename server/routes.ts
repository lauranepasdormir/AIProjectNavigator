import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSubmissionSchema } from "@shared/schema";
import { generateDraftResponse } from "./openai";
import { setupAuth, isAuthReady } from "./auth";
import { pool } from "./db";
import { setupNoAuthProjectSubmissions } from "./disable-auth-for-submissions";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add CORS headers for API requests
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  // Add CORS headers for API requests
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  // Setup authentication
  const { isAuthenticated } = setupAuth(app);

  app.get("/api/setup-status", (_req: Request, res: Response) => {
    res.json({ ready: isAuthReady() });
  });
  
  // Setup direct project submissions endpoint without authentication
  setupNoAuthProjectSubmissions(app, pool);
  
  // Project Submission Routes
  // Admin route - temporarily bypass authentication for debugging
  app.get('/api/project-submissions', async (req: Request, res: Response) => {
    // Log authentication status but proceed anyway for debugging
    console.log('Project submissions auth status:', req.isAuthenticated() ? 'Authenticated' : 'Not authenticated');
    console.log('Session ID:', req.sessionID);
    console.log('User:', req.user || 'None');
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        console.log(`Fetching all project submissions (attempt ${retries + 1}/${maxRetries})...`);
        
        // Verify authentication
        console.log('User authentication:', req.isAuthenticated() ? 'Authenticated' : 'Not authenticated');
        if (req.user) {
          console.log('User details:', req.user);
        }
        
        // Using direct SQL query through the pool instead of the ORM for reliability
        const client = await pool.connect();
        try {
          console.log('Database client acquired, executing query...');
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
          
          console.log(`Retrieved ${submissions.length} project submissions via direct SQL:`, 
            submissions.slice(0, 3).map(s => ({ id: s.id, title: s.title })));
          
          // Set explicit cache control headers
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          
          return res.json(submissions);
        } finally {
          // Release client back to the pool
          client.release();
          console.log('Database client released');
        }
      } catch (error) {
        retries++;
        console.error(`Error fetching project submissions (attempt ${retries}/${maxRetries}):`, error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        
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
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  });

  // Get a specific project - requires authentication for private/internal projects
  app.get('/api/project-submissions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      // Use direct SQL for better reliability
      const client = await pool.connect();
      try {
        console.log(`Fetching project submission ID ${id} via direct SQL...`);
        
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
          WHERE id = $1
        `, [id]);
        
        const submission = result.rows[0];
        
        if (!submission) {
          return res.status(404).json({ error: 'Project submission not found' });
        }
        
        // Only allow access to public projects if not authenticated
        if (!req.isAuthenticated() && submission.visibility !== 'public') {
          return res.status(401).json({ error: 'Authentication required to view this project' });
        }
        
        console.log(`Successfully retrieved project submission ID ${id}`);
        res.json(submission);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching project submission:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ 
        error: 'Failed to fetch project submission',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Route for public projects
  app.get('/api/public-projects', async (req: Request, res: Response) => {
    try {
      console.log('Fetching public projects via direct SQL...');
      const client = await pool.connect();
      try {
        // Direct SQL query with column name mapping to camelCase
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
          WHERE visibility = 'public'
          ORDER BY id DESC
        `);
        const submissions = result.rows;
        console.log(`Retrieved ${submissions.length} public project submissions`);
        
        // Set cache control headers
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.json(submissions);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching public projects:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ 
        error: 'Failed to fetch public projects',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/project-submissions', async (req: Request, res: Response) => {
    try {
      console.log("Received project submission request:", JSON.stringify(req.body, null, 2));
      
      // Validate incoming data
      const validationResult = insertProjectSubmissionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error('Validation failed:', validationResult.error.format());
        return res.status(400).json({ 
          error: 'Invalid project submission data',
          details: validationResult.error.format()
        });
      }
      
      console.log("Validation passed, creating project submission");
      console.log("Project title:", validationResult.data.title);
      console.log("Project description:", validationResult.data.description?.substring(0, 100));
      
      // Insert with direct SQL for better reliability
      const client = await pool.connect();
      try {
        // Convert camelCase to snake_case for the database
        const { 
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
          userId 
        } = validationResult.data;
        
        console.log("Inserting new project submission via direct SQL...");
        
        const now = new Date();
        
        const result = await client.query(`
          INSERT INTO project_submissions (
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
            created_at,
            user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING 
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
        `, [
          username,
          title,
          description,
          problem || "",
          technology || "",
          impact || "",
          team || "",
          status || "In Progress",
          contact || "",
          visibility || "private",
          now,
          userId || null
        ]);
        
        const submission = result.rows[0];
        console.log("Project submission created successfully:", submission);
        res.status(201).json(submission);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating project submission:', error);
      // Include more detailed error information in the response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      res.status(500).json({ 
        error: 'Failed to create project submission',
        message: errorMessage,
        stack: errorStack
      });
    }
  });

  // Draft suggestion API endpoint
  app.post('/api/draft-suggestion', async (req: Request, res: Response) => {
    try {
      console.log("Received draft suggestion request");
      const { question, context } = req.body;
      
      console.log("Draft request question:", question);
      console.log("Draft request context:", context ? Object.keys(context) : "no context");
      
      if (!question || typeof question !== 'string') {
        console.error("Invalid question format");
        return res.status(400).json({ error: 'Question is required' });
      }
      
      console.log("Calling OpenAI generateDraftResponse...");
      const suggestion = await generateDraftResponse(question, context);
      console.log("Draft suggestion generated successfully");
      
      res.json({ suggestion });
    } catch (error) {
      console.error('Error generating draft suggestion:', error);
      
      // More detailed error response
      let errorMessage = 'Failed to generate draft suggestion';
      let errorDetails = 'Unknown error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || 'No stack trace';
      }
      
      res.status(500).json({ 
        error: errorMessage,
        details: errorDetails
      });
    }
  });

  // Delete a project submission - using direct access pattern
  app.delete('/api/project-submissions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      // Use direct SQL for better reliability
      const client = await pool.connect();
      try {
        // First check if the submission exists
        console.log(`Checking if project submission ID ${id} exists...`);
        const checkResult = await client.query(`
          SELECT id FROM project_submissions WHERE id = $1
        `, [id]);
        
        if (checkResult.rowCount === 0) {
          return res.status(404).json({ error: 'Project submission not found' });
        }
        
        // Delete the submission directly with SQL
        console.log(`Deleting project submission ID ${id}...`);
        const deleteResult = await client.query(`
          DELETE FROM project_submissions WHERE id = $1
        `, [id]);
        
        console.log(`Successfully deleted project submission ID ${id}`);
        res.status(200).json({ success: true });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error deleting project submission:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ 
        error: 'Failed to delete project submission',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  // 5) Final catch-all for unknown API routes
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
