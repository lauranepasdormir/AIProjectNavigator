import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Determine if we're in development mode
export const isDevelopment = process.env.NODE_ENV === 'development';

// Get the appropriate database URL based on environment
export const getDatabaseUrl = (): string => {
  // In development, prefer DEV_DATABASE_URL if it's not empty
  if (isDevelopment && process.env.DEV_DATABASE_URL && process.env.DEV_DATABASE_URL.trim() !== '') {
    return process.env.DEV_DATABASE_URL;
  }
  
  // In production, prefer PROD_DATABASE_URL if it's not empty
  if (!isDevelopment && process.env.PROD_DATABASE_URL && process.env.PROD_DATABASE_URL.trim() !== '') {
    return process.env.PROD_DATABASE_URL;
  }
  
  // Fallback to the default DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  throw new Error('Database URL must be set. Did you forget to provision a database?');
};

// Log the current environment
export const logEnvironment = (): void => {
  console.log(`Running in ${isDevelopment ? 'development' : 'production'} mode`);
  
  // Determine which database URL is being used
  const usingDevDb = isDevelopment && process.env.DEV_DATABASE_URL && process.env.DEV_DATABASE_URL.trim() !== '';
  const usingProdDb = !isDevelopment && process.env.PROD_DATABASE_URL && process.env.PROD_DATABASE_URL.trim() !== '';
  const dbSource = usingDevDb ? 'development' : (usingProdDb ? 'production' : 'default');
  
  console.log(`Using ${dbSource} database connection`);
};