# replit.md

## Overview

This is an AI-powered project showcase platform built with React.js frontend and Express.js backend. The application allows users to submit project showcases through an interactive form interface, provides admin controls for managing submissions, and features AI-powered draft generation capabilities using OpenAI. The system supports both development and production environments with separate database configurations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Components**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack React Query for server state management
- **Routing**: Client-side routing with React Router
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful endpoints with proper error handling and CORS support

### Database Architecture
- **Primary Database**: PostgreSQL hosted on Neon serverless
- **ORM**: Drizzle ORM with schema-first approach
- **Connection Pooling**: Neon serverless connection pooling with WebSocket support
- **Environment Separation**: Separate database URLs for development and production

## Key Components

### Authentication System
- Session-based authentication with hardcoded admin credentials
- Admin email: `admin@digitalvillage.com.au`
- Password hashing using Node.js crypto with scrypt
- PostgreSQL session store for persistence
- Authentication middleware protecting admin routes

### Project Submission System
- Comprehensive form with fields for title, description, problem, technology, impact, team, status, and contact
- Visibility controls (public/private/internal)
- CRUD operations for project management
- AI-powered draft generation for form fields

### AI Integration
- OpenAI GPT-4o integration for generating draft responses
- Context-aware suggestions based on existing form data
- Configurable through environment variables

### Admin Dashboard
- Protected admin panel for managing all submissions
- Filtering and visibility management capabilities
- Direct database endpoint bypass for troubleshooting
- Comprehensive project listing with edit/delete functionality

## Data Flow

1. **User Submission Flow**:
   - User fills project submission form
   - Optional AI assistance for content generation
   - Form validation and submission to backend
   - Data stored in PostgreSQL database

2. **Admin Management Flow**:
   - Admin authentication through login page
   - Session-based access to protected routes
   - CRUD operations on project submissions
   - Real-time data updates through React Query

3. **Public Display Flow**:
   - Public projects accessible without authentication
   - Filtered database queries for public visibility
   - Optimized caching and error handling

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless
- **AI Service**: OpenAI API for content generation
- **Session Storage**: PostgreSQL-backed sessions
- **Build Tools**: Vite, ESBuild for production builds

### Environment Configuration
- Development and production environment separation
- Environment-specific database URLs
- Configurable through `.env` files and environment scripts

## Deployment Strategy

### Development Environment
- Hot-reloading with Vite dev server
- Development database connection
- Enhanced debugging and error reporting
- Accessible at `localhost:5000`

### Production Environment
- Static file serving from `server/public`
- Optimized builds with code splitting
- Production database configuration
- Health check endpoints for deployment monitoring
- Replit deployment configuration with autoscale

### Build Process
1. Frontend build using Vite
2. Backend compilation with ESBuild
3. Static files copied to `server/public`
4. Production server starts with `tsx server/index.ts`

### Deployment Configuration
- Replit deployment with autoscale target
- Health check endpoint at `/replit-deploy-health`
- Environment variable management through scripts
- Database migration scripts for schema updates

## Recent Changes

- **June 25, 2025**: Enhanced database connection reliability
  - Fixed database connection pool configuration with better error handling
  - Added retry logic for all database operations to handle temporary connectivity issues
  - Improved session storage with fallback mechanisms
  - Resolved authentication issues that were preventing admin login
  - Application now successfully handles database reconnections automatically

- **June 25, 2025**: Database crash resolution
  - Identified and fixed "Connection terminated unexpectedly" errors
  - Implemented exponential backoff retry strategy for database operations
  - Added connection event logging for better monitoring
  - Reduced connection pool size to prevent overwhelming the database server

## Changelog

- June 25, 2025. Initial setup and database reliability improvements

## User Preferences

Preferred communication style: Simple, everyday language.