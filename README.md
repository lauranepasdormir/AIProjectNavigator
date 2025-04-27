# Project Showcase Platform

An AI-powered web application for submitting and managing project showcases, featuring an interactive form interface with comprehensive admin controls and advanced editing capabilities.

## Features

- React.js frontend with TypeScript
- Express.js backend
- Database-backed storage for project data
- Responsive footer with admin access link
- Enhanced markdown editing and preview functionality
- Refined admin dashboard with visibility management
- Consistent navigation with footer-based authentication links

## Environment Configuration

This project supports both development and production environments with different database connections.

### Development Environment

The development environment uses a dedicated database for testing and development purposes.

### Production Environment

The production environment uses a separate database optimized for production use.

### Switching Environments

You can easily switch between development and production environments using the provided scripts:

```bash
# Switch to development environment
node scripts/switch-env.js dev

# Switch to production environment
node scripts/switch-env.js prod
```

### Setting Up a New Environment

If you need to set up a new environment or update database connections, use the `set-env.js` script:

```bash
# Set up development environment with current DATABASE_URL
node scripts/set-env.js dev

# Set up production environment with current DATABASE_URL
node scripts/set-env.js prod
```

### Testing Database Connection

You can test the database connection for the current environment using the `test-db-connection.js` script:

```bash
# Test connection to development database
NODE_ENV=development node scripts/test-db-connection.js

# Test connection to production database
NODE_ENV=production node scripts/test-db-connection.js
```

## Database Configuration

The application automatically selects the appropriate database connection based on the current environment:

- In development mode, it uses `DEV_DATABASE_URL` from the .env file
- In production mode, it uses `PROD_DATABASE_URL` from the .env file
- If the environment-specific URL is not available, it falls back to `DATABASE_URL`

## Running the Application

```bash
# Start in development mode
npm run dev

# Build for production
npm run build

# Start in production mode
npm run start
```