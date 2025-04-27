import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pool with improved settings for reliability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // increase from default
  idleTimeoutMillis: 30000, // timeout after 30 seconds
  connectionTimeoutMillis: 5000, // timeout after 5 seconds
});

// Wrap DB interactions to add automatic retries
const createDbWithRetry = () => {
  const dbInstance = drizzle({ client: pool, schema });
  
  // Create a proxy to add retry logic around all query operations
  return new Proxy(dbInstance, {
    get: (target, prop) => {
      // Only add retry logic to these methods
      const methodsToWrap = ['select', 'insert', 'update', 'delete', 'query'];
      
      if (methodsToWrap.includes(prop.toString())) {
        const originalMethod = target[prop];
        
        // Return a wrapped version of the method
        return async (...args) => {
          let attempts = 0;
          const maxAttempts = 3;
          let lastError;
          
          while (attempts < maxAttempts) {
            try {
              attempts++;
              return await originalMethod.apply(target, args);
            } catch (error) {
              lastError = error;
              console.error(`Database operation failed (attempt ${attempts}/${maxAttempts}):`, error.message);
              
              if (attempts >= maxAttempts) {
                console.error(`Max retry attempts (${maxAttempts}) reached for database operation.`);
                throw error;
              }
              
              // Exponential backoff
              const delay = Math.min(100 * Math.pow(2, attempts), 2000);
              console.log(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          
          throw lastError;
        };
      }
      
      return target[prop];
    }
  });
};

export const db = createDbWithRetry();
