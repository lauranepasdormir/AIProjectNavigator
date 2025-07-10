import { 
  users, 
  type User, 
  type InsertUser, 
  projectSubmissions, 
  type ProjectSubmission, 
  type InsertProjectSubmission 
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import createMemoryStore from "memorystore";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project submission methods
  getProjectSubmission(id: number): Promise<ProjectSubmission | undefined>;
  getAllProjectSubmissions(): Promise<ProjectSubmission[]>;
  createProjectSubmission(submission: InsertProjectSubmission): Promise<ProjectSubmission>;
  deleteProjectSubmission(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projectSubmissions: Map<number, ProjectSubmission>;
  private userCurrentId: number;
  private submissionCurrentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.projectSubmissions = new Map();
    this.userCurrentId = 1;
    this.submissionCurrentId = 1;
    
    // Create a memory store for sessions (not persistent)
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }
  
  // Project submission methods
  async getProjectSubmission(id: number): Promise<ProjectSubmission | undefined> {
    return this.projectSubmissions.get(id);
  }
  
  async getAllProjectSubmissions(): Promise<ProjectSubmission[]> {
    return Array.from(this.projectSubmissions.values());
  }
  
  async createProjectSubmission(submission: InsertProjectSubmission): Promise<ProjectSubmission> {
    const id = this.submissionCurrentId++;
    
    // Create a complete submission with all required fields
    const projectSubmission: ProjectSubmission = {
      id,
      createdAt: new Date(),
      username: submission.username ?? "Anonymous User",
      title: submission.title,
      description: submission.description,
      problem: submission.problem,
      technology: submission.technology,
      impact: submission.impact,
      team: submission.team ?? "",
      status: submission.status,
      visibility: submission.visibility ?? "private",
      userId: submission.userId ?? null
    };
    
    this.projectSubmissions.set(id, projectSubmission);
    return projectSubmission;
  }
  
  async deleteProjectSubmission(id: number): Promise<boolean> {
    if (!this.projectSubmissions.has(id)) {
      return false;
    }
    
    return this.projectSubmissions.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private maxRetries = 3;
  
  constructor() {
    // Create memory store as fallback, will switch to PostgreSQL if successful
    const MemoryStore = createMemoryStore(session);
    const memoryStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Create PostgreSQL session store
    try {
      const PostgresSessionStore = connectPg(session);
      this.sessionStore = new PostgresSessionStore({
        pool,
        createTableIfMissing: true,
        errorLog: (err) => console.error('Session store error:', err),
        pruneSessionInterval: 60 // Prune expired sessions every minute
      });
      console.log('Successfully created PostgreSQL session store');
    } catch (error) {
      console.error('Failed to create PostgreSQL session store, using memory store instead:', error);
      this.sessionStore = memoryStore;
    }
  }
  
  // Helper method for database operations with retry
  private async withRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    let retries = 0;
    
    while (true) {
      try {
        return await fn();
      } catch (error) {
        retries++;
        console.error(`Error in ${operation} (attempt ${retries}/${this.maxRetries}):`, 
          error instanceof Error ? error.message : 'Unknown error');
        
        if (retries >= this.maxRetries) {
          console.error(`Maximum retries reached for ${operation}, throwing error`);
          throw error;
        }
        
        // Add exponential backoff
        const delay = Math.pow(2, retries) * 500; // 1s, 2s, 4s
        console.log(`Retrying ${operation} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.withRetry('getUser', async () => {
      const result = await db.select().from(users).where(eq(users.id, id));
      if (result.length === 0) return undefined;
      return result[0];
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.withRetry('getUserByUsername', async () => {
      const result = await db.select().from(users).where(eq(users.username, username));
      if (result.length === 0) return undefined;
      return result[0];
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return this.withRetry('createUser', async () => {
      const result = await db
        .insert(users)
        .values(insertUser)
        .returning();
      
      if (result.length === 0) {
        throw new Error("Failed to create user: No user returned");
      }
      
      return result[0];
    });
  }
  
  // Project submission methods
  async getProjectSubmission(id: number): Promise<ProjectSubmission | undefined> {
    return this.withRetry('getProjectSubmission', async () => {
      const result = await db.select().from(projectSubmissions).where(eq(projectSubmissions.id, id));
      if (result.length === 0) return undefined;
      return result[0];
    });
  }
  
  async getAllProjectSubmissions(): Promise<ProjectSubmission[]> {
    return this.withRetry('getAllProjectSubmissions', async () => {
      console.log('Attempting to fetch all project submissions from database...');
      const results = await db.select().from(projectSubmissions);
      console.log(`Successfully retrieved ${results.length} project submissions`);
      return results;
    });
  }
  
  async createProjectSubmission(submission: InsertProjectSubmission): Promise<ProjectSubmission> {
    return this.withRetry('createProjectSubmission', async () => {
      // Ensure username is set with a default if not provided
      const submissionWithDefaults = {
        ...submission,
        username: submission.username ?? "Anonymous User"
      };
      
      const result = await db
        .insert(projectSubmissions)
        .values(submissionWithDefaults)
        .returning();
        
      if (result.length === 0) {
        throw new Error("Failed to create project submission: No submission returned");
      }
      
      return result[0];
    });
  }
  
  async deleteProjectSubmission(id: number): Promise<boolean> {
    return this.withRetry('deleteProjectSubmission', async () => {
      const result = await db
        .delete(projectSubmissions)
        .where(eq(projectSubmissions.id, id))
        .returning({ id: projectSubmissions.id });
      
      return result.length > 0;
    }).catch(error => {
      console.error("Error deleting project submission:", error);
      return false;
    });
  }
}

// Switch to database storage
export const storage = new DatabaseStorage();
