#!/usr/bin/env node

/**
 * Script to seed the database with sample data
 * This script creates sample project submissions for testing
 * 
 * Usage: 
 *   - node scripts/seed-database.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import ws from 'ws';

// Set WebSocket constructor for Neon serverless
neonConfig.webSocketConstructor = ws;

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('=== Database Seed ===');

// Get the appropriate database URL based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const getDatabaseUrl = () => {
  // In development, prefer DEV_DATABASE_URL if it's not empty
  if (isDevelopment && process.env.DEV_DATABASE_URL && process.env.DEV_DATABASE_URL.trim() !== '') {
    console.log('Using DEV_DATABASE_URL');
    return process.env.DEV_DATABASE_URL;
  }
  
  // In production, prefer PROD_DATABASE_URL if it's not empty
  if (!isDevelopment && process.env.PROD_DATABASE_URL && process.env.PROD_DATABASE_URL.trim() !== '') {
    console.log('Using PROD_DATABASE_URL');
    return process.env.PROD_DATABASE_URL;
  }
  
  // Fallback to the default DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('Using fallback DATABASE_URL');
    return process.env.DATABASE_URL;
  }
  
  throw new Error('Database URL must be set. Did you forget to provision a database?');
};

// Sample project submissions for seeding
const sampleProjects = [
  {
    username: "demo_user",
    title: "AI Image Recognition Tool",
    description: "A tool that uses advanced AI to identify objects and scenes in images with high accuracy.",
    problem: "Manual image tagging is time-consuming and error-prone, especially at scale.",
    technology: "Python, TensorFlow, OpenCV, React",
    impact: "Reduces image tagging time by 85% while improving accuracy to 96%, enabling faster content management.",
    team: "Alex Johnson, Maria Rodriguez, Sam Patel",
    status: "In Progress",
    contact: "alex.johnson@example.com",
    visibility: "public"
  },
  {
    username: "tech_lead",
    title: "Smart Home Energy Management",
    description: "System that optimizes home energy usage through AI predictions and smart device control.",
    problem: "Households waste significant energy due to inefficient usage patterns and lack of automation.",
    technology: "Node.js, MQTT, TensorFlow, React Native, IoT hardware",
    impact: "Reduces household energy consumption by 22% on average, saving costs and reducing carbon footprint.",
    team: "Jamie Smith, Riley Cooper",
    status: "Completed",
    contact: "jamie.smith@example.com",
    visibility: "internal"
  },
  {
    username: "project_manager",
    title: "Quantum Computing Algorithm Library",
    description: "Open-source library of optimized algorithms for quantum computing platforms.",
    problem: "Quantum computing lacks standardized algorithm implementations, hindering adoption and research.",
    technology: "Q#, Python, Qiskit",
    impact: "Accelerates quantum computing research by providing optimized, ready-to-use algorithm implementations.",
    team: "Dr. Quinn Zhang, Maya Patel, Jordan Lee",
    status: "In Progress",
    contact: "qzhang@example.com",
    visibility: "private"
  }
];

// Seed the database
async function seedDatabase() {
  const databaseUrl = getDatabaseUrl();
  console.log(`Database URL (masked): ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);
  
  const pool = new Pool({ 
    connectionString: databaseUrl,
    max: 10, 
    idleTimeoutMillis: 30000 
  });

  try {
    // Test basic connection
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✓ Database connection successful');
    
    // Check if sample data already exists
    console.log('Checking for existing project submissions...');
    const countResult = await client.query('SELECT COUNT(*) FROM project_submissions');
    const count = parseInt(countResult.rows[0].count);
    console.log(`project_submissions table currently has ${count} rows`);
    
    // Add sample projects
    console.log('\nAdding sample project submissions...');
    for (const project of sampleProjects) {
      const columns = Object.keys(project).join(', ');
      const placeholders = Object.keys(project).map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(project);
      
      const query = `
        INSERT INTO project_submissions (${columns})
        VALUES (${placeholders})
        RETURNING id, title;
      `;
      
      try {
        const result = await client.query(query, values);
        console.log(`✓ Added project: ${result.rows[0].title} (ID: ${result.rows[0].id})`);
      } catch (error) {
        console.error(`❌ Failed to add project "${project.title}":`, error.message);
      }
    }
    
    // Verify final count
    const finalCountResult = await client.query('SELECT COUNT(*) FROM project_submissions');
    const finalCount = parseInt(finalCountResult.rows[0].count);
    console.log(`\nproject_submissions table now has ${finalCount} rows`);
    
    // Show all projects
    console.log('\nCurrent projects in database:');
    const projectsResult = await client.query('SELECT id, title, username, visibility FROM project_submissions ORDER BY id');
    projectsResult.rows.forEach(row => {
      console.log(`- [${row.id}] ${row.title} (${row.visibility}) by ${row.username}`);
    });
    
    client.release();
    console.log('\n✓ Database seeding completed');
    
  } catch (error) {
    console.error('❌ Database error:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  try {
    await seedDatabase();
    console.log('\n=== Database Seed Completed ===');
  } catch (error) {
    console.error('\n❌ Database Seed Failed');
    console.error('Please check your database configuration and try again.');
    process.exit(1);
  }
}

main();