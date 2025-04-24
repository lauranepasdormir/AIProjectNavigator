import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertProjectSubmissionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Project Submission Routes
  app.get('/api/project-submissions', async (req: Request, res: Response) => {
    try {
      const submissions = await storage.getAllProjectSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching project submissions:', error);
      res.status(500).json({ error: 'Failed to fetch project submissions' });
    }
  });

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

      res.json(submission);
    } catch (error) {
      console.error('Error fetching project submission:', error);
      res.status(500).json({ error: 'Failed to fetch project submission' });
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

  const httpServer = createServer(app);
  return httpServer;
}
