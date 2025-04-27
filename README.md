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

You can also switch environments and run migrations in a single step:

```bash
# Switch to development environment and run migrations
node scripts/switch-and-migrate.js dev

# Switch to production environment and run migrations
node scripts/switch-and-migrate.js prod
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
node scripts/build-for-production.js

# Start in production mode
NODE_ENV=production tsx server/index.ts
```

## Preparing for Deployment

Before deploying the application, make sure to:

1. Build the application for production:
   ```bash
   node scripts/build-for-production.js
   ```

2. Verify deployment readiness:
   ```bash
   node scripts/verify-deployment-readiness.js
   ```

3. Ensure your production database is properly configured:
   ```bash
   node scripts/set-env.js prod
   ```

4. Test the production database connection:
   ```bash
   NODE_ENV=production node scripts/test-db-connection.js
   ```

## Deploying on Replit

To deploy the application on Replit:

1. Run the deployment readiness verification:
   ```bash
   node scripts/verify-deployment-readiness.js
   ```

2. If all tests pass, click the "Deploy" button in the Replit UI.

3. The deployment process will:
   - Build the application (using the build script)
   - Set up the environment
   - Start the server in production mode
   - Perform health checks (which will use the root endpoint)

4. Once deployed, your application will be available at your Replit deployment URL.

### Important Deployment Notes

- The root endpoint (/) is configured to respond immediately for health checks
- The actual application is accessible via both / and /app routes in the deployed application
- The application automatically uses the production database when deployed