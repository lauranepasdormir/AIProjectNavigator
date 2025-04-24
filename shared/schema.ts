import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projectSubmissions = pgTable("project_submissions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  problem: text("problem").notNull(),
  technology: text("technology").notNull(),
  impact: text("impact").notNull(),
  team: text("team"),
  status: text("status").notNull(),
  contact: text("contact").notNull(),
  createdAt: text("created_at").notNull(),
});

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
}
