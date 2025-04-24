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

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project submission methods
  getProjectSubmission(id: number): Promise<ProjectSubmission | undefined>;
  getAllProjectSubmissions(): Promise<ProjectSubmission[]>;
  createProjectSubmission(submission: InsertProjectSubmission): Promise<ProjectSubmission>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projectSubmissions: Map<number, ProjectSubmission>;
  private userCurrentId: number;
  private submissionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.projectSubmissions = new Map();
    this.userCurrentId = 1;
    this.submissionCurrentId = 1;
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
    const projectSubmission: ProjectSubmission = {
      ...submission,
      id,
      createdAt: new Date(),
      // Ensure all required fields are present
      team: submission.team ?? "", // Use nullish coalescing to handle undefined
      userId: submission.userId ?? null
    };
    this.projectSubmissions.set(id, projectSubmission);
    return projectSubmission;
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Project submission methods
  async getProjectSubmission(id: number): Promise<ProjectSubmission | undefined> {
    const [submission] = await db.select().from(projectSubmissions).where(eq(projectSubmissions.id, id));
    return submission || undefined;
  }
  
  async getAllProjectSubmissions(): Promise<ProjectSubmission[]> {
    return await db.select().from(projectSubmissions);
  }
  
  async createProjectSubmission(submission: InsertProjectSubmission): Promise<ProjectSubmission> {
    const [projectSubmission] = await db
      .insert(projectSubmissions)
      .values(submission)
      .returning();
    return projectSubmission;
  }
}

// Switch to database storage
export const storage = new DatabaseStorage();
