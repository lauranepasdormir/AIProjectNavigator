import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSubmissionSchema } from "@shared/schema";
import { generateDraftResponse } from "./openai";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  const { isAuthenticated } = setupAuth(app);
  
  // Project Submission Routes
  // Admin route - requires authentication
  app.get('/api/project-submissions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const submissions = await storage.getAllProjectSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching project submissions:', error);
      res.status(500).json({ error: 'Failed to fetch project submissions' });
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
      // Validate incoming data
      const validationResult = insertProjectSubmissionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid project submission data',
          details: validationResult.error.format()
        });
      }
      
      // Insert into database
      const submission = await storage.createProjectSubmission(validationResult.data);
      
      res.status(201).json(submission);
    } catch (error) {
      console.error('Error creating project submission:', error);
      res.status(500).json({ error: 'Failed to create project submission' });
    }
  });

  // Draft suggestion API endpoint
  app.post('/api/draft-suggestion', async (req: Request, res: Response) => {
    try {
      const { question, context } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question is required' });
      }
      
      const suggestion = await generateDraftResponse(question, context);
      res.json({ suggestion });
    } catch (error) {
      console.error('Error generating draft suggestion:', error);
      res.status(500).json({ 
        error: 'Failed to generate draft suggestion',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
