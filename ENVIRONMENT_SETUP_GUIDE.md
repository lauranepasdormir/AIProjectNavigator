# Environment Setup Guide

This guide explains how to configure and switch between development and production environments for the Project Showcase Platform.

## Overview

The application supports two distinct environments:

1. **Development Environment** - Uses `DEV_DATABASE_URL` for database connections
2. **Production Environment** - Uses `PROD_DATABASE_URL` for database connections

Each environment can have its own database, allowing you to develop and test without affecting production data.

## Configuration Files

- `.env` - Main environment configuration file
- `.prod/.env.prod.template` - Template for production environment

## Using Environment Scripts

We've created several utility scripts to help manage environments:

### Switch Between Environments

```bash
# Switch to development environment
node scripts/switch-env.js dev

# Switch to production environment
node scripts/switch-env.js prod
```

### Set Up Environment with Current Database URL

```bash
# Set up development environment with current DATABASE_URL
node scripts/set-env.js dev

# Set up production environment with current DATABASE_URL
node scripts/set-env.js prod
```

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
  "setup:prod": "node scripts/set-env.js prod"
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