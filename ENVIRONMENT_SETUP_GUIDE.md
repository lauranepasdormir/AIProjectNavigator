# Database Environment Setup Guide

This guide explains how to set up and manage separate database environments for development and production in this application.

## Overview

The application supports multiple database environments:

1. **Development Environment**: Used for local development and testing
2. **Production Environment**: Used for the live application

Each environment can have its own database connection, allowing you to work with different databases depending on your needs.

## Environment Configuration

Environment-specific configuration is stored in `.env` files:

- `.env`: The active environment configuration
- `.env.dev.template`: Template for development environment
- `.env.prod.template`: Template for production environment

## Setting Up Environments

### Initial Setup

First, decide which environment you want to use (development or production) and create the appropriate `.env` file:

```bash
# For development environment
node scripts/set-env.js dev

# For production environment
node scripts/set-env.js prod
```

This will create an `.env` file with the appropriate environment variables.

### Switching Environments

To switch between environments, use the `switch-env.js` script:

```bash
# Switch to development environment
node scripts/switch-env.js dev

# Switch to production environment
node scripts/switch-env.js prod
```

To switch environments and run database migrations in a single step:

```bash
# Switch to development environment and run migrations
node scripts/switch-and-migrate.js dev

# Switch to production environment and run migrations
node scripts/switch-and-migrate.js prod
```

## Database URLs

The application uses different environment variables for database connections:

- `DEV_DATABASE_URL`: Used in development mode
- `PROD_DATABASE_URL`: Used in production mode
- `DATABASE_URL`: Used as a fallback when environment-specific URLs are not available

## Recommended Package.json Scripts

For easier management, consider adding these scripts to your package.json:

```json
"scripts": {
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "node scripts/db-migrate.js",
  "env:dev": "node scripts/switch-env.js dev",
  "env:prod": "node scripts/switch-env.js prod",
  "setup:dev": "node scripts/set-env.js dev",
  "setup:prod": "node scripts/set-env.js prod",
  "env:dev:migrate": "node scripts/switch-and-migrate.js dev",
  "env:prod:migrate": "node scripts/switch-and-migrate.js prod",
  "db:test": "NODE_ENV=development node scripts/test-db-connection.js"
}
```

## How It Works

The application determines which database URL to use through these steps:

1. Check the `NODE_ENV` environment variable
2. For development mode:
   - Use `DEV_DATABASE_URL` if available
   - Fall back to `DATABASE_URL` if `DEV_DATABASE_URL` is not defined
3. For production mode:
   - Use `PROD_DATABASE_URL` if available
   - Fall back to `DATABASE_URL` if `PROD_DATABASE_URL` is not defined

This logic is implemented in the `server/env.ts` file.

## Production Deployment

When deploying to production:

1. Switch to production environment: `node scripts/switch-env.js prod`
2. Update the `.env` file with your production database URL
3. Build the application: `npm run build`
4. Start the production server: `npm run start`

## Additional Notes

- Remember to run `npm run db:push` after changing environments to ensure the database schema is up to date
- The database URL can include connection parameters like SSL requirements that may differ between development and production
- Use the `scripts/test-db-connection.js` script to verify your database connection

## Troubleshooting

If you encounter database connection issues:

1. Verify your database URL is correct
2. Check that the database server is running and accessible
3. Ensure your database user has the necessary permissions
4. Run `NODE_ENV=development node scripts/test-db-connection.js` to test the connection