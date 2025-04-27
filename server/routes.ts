import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSubmissionSchema } from "@shared/schema";
import { generateDraftResponse } from "./openai";
import { setupAuth } from "./auth";
import { pool } from "./db";

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
  
  // Project Submission Routes
  // Admin route - requires authentication
  app.get('/api/project-submissions', isAuthenticated, async (req: Request, res: Response) => {
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
          const result = await client.query('SELECT * FROM project_submissions ORDER BY id DESC');
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

      const submission = await storage.getProjectSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: 'Project submission not found' });
      }

      // Only allow access to public projects if not authenticated
      if (!req.isAuthenticated() && submission.visibility !== 'public') {
        return res.status(401).json({ error: 'Authentication required to view this project' });
      }

      res.json(submission);
    } catch (error) {
      console.error('Error fetching project submission:', error);
      res.status(500).json({ error: 'Failed to fetch project submission' });
    }
  });
  
  // Route for public projects
  app.get('/api/public-projects', async (req: Request, res: Response) => {
    try {
      const allSubmissions = await storage.getAllProjectSubmissions();
      const publicSubmissions = allSubmissions.filter(submission => submission.visibility === 'public');
      res.json(publicSubmissions);
    } catch (error) {
      console.error('Error fetching public projects:', error);
      res.status(500).json({ error: 'Failed to fetch public projects' });
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
      
      // Insert into database
      try {
        const submission = await storage.createProjectSubmission(validationResult.data);
        console.log("Project submission created successfully:", submission);
        res.status(201).json(submission);
      } catch (dbError) {
        console.error('Database error creating project submission:', dbError);
        throw dbError;
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

  // Delete a project submission - requires authentication (admin only)
  app.delete('/api/project-submissions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      // Check if submission exists
      const submission = await storage.getProjectSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: 'Project submission not found' });
      }
      
      // Delete the submission
      const success = await storage.deleteProjectSubmission(id);
      
      if (success) {
        res.status(200).json({ success: true, message: 'Project submission deleted successfully' });
      } else {
        res.status(500).json({ error: 'Failed to delete project submission' });
      }
    } catch (error) {
      console.error('Error deleting project submission:', error);
      res.status(500).json({ error: 'Failed to delete project submission' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
