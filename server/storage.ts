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
      contact: submission.contact,
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
  
  constructor() {
    // Create PostgreSQL session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      if (result.length === 0) return undefined;
      return result[0];
    } catch (error) {
      console.error("Error in getUser:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      if (result.length === 0) return undefined;
      return result[0];
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await db
        .insert(users)
        .values(insertUser)
        .returning();
      
      if (result.length === 0) {
        throw new Error("Failed to create user: No user returned");
      }
      
      return result[0];
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }
  
  // Project submission methods
  async getProjectSubmission(id: number): Promise<ProjectSubmission | undefined> {
    try {
      const result = await db.select().from(projectSubmissions).where(eq(projectSubmissions.id, id));
      if (result.length === 0) return undefined;
      return result[0];
    } catch (error) {
      console.error("Error in getProjectSubmission:", error);
      throw error;
    }
  }
  
  async getAllProjectSubmissions(): Promise<ProjectSubmission[]> {
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        console.log(`DatabaseStorage: Attempting to fetch all project submissions from database (attempt ${retries + 1}/${maxRetries})...`);
        const results = await db.select().from(projectSubmissions);
        console.log(`DatabaseStorage: Successfully retrieved ${results.length} project submissions`);
        return results;
      } catch (error) {
        retries++;
        console.error(`DatabaseStorage: Error fetching all project submissions (attempt ${retries}/${maxRetries}):`, error);
        console.error('DatabaseStorage: Error details:', error instanceof Error ? error.message : 'Unknown error');
        
        if (retries >= maxRetries) {
          console.error('DatabaseStorage: Maximum retries reached, throwing error');
          // Re-throw to be handled by the calling code
          throw error;
        } else {
          // Add exponential backoff
          const delay = Math.pow(2, retries) * 500; // 1s, 2s, 4s
          console.log(`DatabaseStorage: Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // This line should never be reached due to the throw in the catch block above
    // but TypeScript requires a return statement
    return [];
  }
  
  async createProjectSubmission(submission: InsertProjectSubmission): Promise<ProjectSubmission> {
    try {
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
    } catch (error) {
      console.error("Error in createProjectSubmission:", error);
      throw error;
    }
  }
  
  async deleteProjectSubmission(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(projectSubmissions)
        .where(eq(projectSubmissions.id, id))
        .returning({ id: projectSubmissions.id });
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting project submission:", error);
      return false;
    }
  }
}

// Switch to database storage
export const storage = new DatabaseStorage();
