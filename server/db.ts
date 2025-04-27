import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getDatabaseUrl, logEnvironment } from './env';

neonConfig.webSocketConstructor = ws;

// Log environment information
logEnvironment();

// Get the appropriate database URL
const databaseUrl = getDatabaseUrl();

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
