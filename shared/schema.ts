import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectSubmissions = pgTable("project_submissions", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().default("Anonymous User"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  problem: text("problem").notNull(),
  technology: text("technology").notNull(),
  impact: text("impact").notNull(),
  team: text("team").notNull().default(""),
  status: text("status").notNull(),
  // contact: text("contact").notNull(),
  visibility: text("visibility").notNull().default("private"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertProjectSubmissionSchema = createInsertSchema(projectSubmissions).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectSubmission = z.infer<typeof insertProjectSubmissionSchema>;
export type ProjectSubmission = typeof projectSubmissions.$inferSelect;

// Chat message type for frontend
export interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  isAIGenerated?: boolean;
}
