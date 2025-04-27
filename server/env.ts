import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the database URL - using a single URL for both environments
export const getDatabaseUrl = (): string => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }
  return process.env.DATABASE_URL;
};

// Log the current environment
export const logEnvironment = (): void => {
  console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log('Using database connection from DATABASE_URL');
};