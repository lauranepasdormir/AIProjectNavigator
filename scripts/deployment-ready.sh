#!/bin/bash

# This script prepares the application for deployment on Replit
# It ensures all necessary build steps are completed and verifies deployment readiness

# Terminal colors for prettier output
RESET='\033[0m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'

echo -e "${BOLD}${CYAN}=== Preparing Application for Deployment ===${RESET}\n"

# Step 1: Verify that we have a correct environment setup
echo -e "${YELLOW}Step 1: Verifying environment setup...${RESET}"

# Check if .env file exists
if [ -f ".env" ]; then
  echo -e "${GREEN}✓ .env file found${RESET}"
  
  # Check if PROD_DATABASE_URL is set
  if grep -q "PROD_DATABASE_URL" .env; then
    echo -e "${GREEN}✓ PROD_DATABASE_URL is configured${RESET}"
  else
    echo -e "${RED}✗ PROD_DATABASE_URL is not set in .env${RESET}"
    echo -e "${YELLOW}Setting up production environment...${RESET}"
    node scripts/set-env.js prod
  fi
  
  # Check if OPENAI_API_KEY is set
  if grep -q "OPENAI_API_KEY" .env; then
    echo -e "${GREEN}✓ OPENAI_API_KEY is configured${RESET}"
  else
    echo -e "${RED}✗ OPENAI_API_KEY is not set in .env${RESET}"
    echo -e "${YELLOW}Please set your OPENAI_API_KEY in the .env file${RESET}"
  fi
else
  echo -e "${RED}✗ .env file not found${RESET}"
  echo -e "${YELLOW}Creating .env file from template...${RESET}"
  node scripts/set-env.js prod
fi

echo -e "\n${GREEN}✓ Environment verification complete${RESET}\n"

# Step 2: Build the application for production
echo -e "${YELLOW}Step 2: Building application for production...${RESET}"
node scripts/build-for-production.js

# Step 3: Ensure server/public directory is correctly set up
echo -e "\n${YELLOW}Step 3: Ensuring server/public directory is properly configured...${RESET}"
node scripts/ensure-server-public.js

# Step 4: Fix admin panel and database issues
echo -e "\n${YELLOW}Step 4: Fixing admin panel and database for production...${RESET}"
node scripts/fix-production-admin.js

# Step 5: Fix authentication and session management
echo -e "\n${YELLOW}Step 5: Fixing authentication and session management...${RESET}"
node scripts/fix-production-auth.js

# Step 6: Fix API routes for better error handling
echo -e "\n${YELLOW}Step 6: Fixing API routes for better error handling...${RESET}"
node scripts/fix-api-routes.js

# Step 6: Verify deployment readiness
echo -e "\n${YELLOW}Step 6: Verifying deployment readiness...${RESET}"
node scripts/verify-deployment-readiness.js

# Step 7: Final verification of health check endpoints
echo -e "\n${YELLOW}Step 7: Verifying health check endpoints...${RESET}"

# Check the health endpoint
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/health")
if [ "$HEALTH_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ Health endpoint (/health) is responding with HTTP 200${RESET}"
else
  echo -e "${RED}✗ Health endpoint (/health) is not responding correctly. Status: $HEALTH_STATUS${RESET}"
fi

# Check the replit deployment health endpoint
REPLIT_HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/replit-deploy-health")
if [ "$REPLIT_HEALTH_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ Replit deployment health endpoint (/replit-deploy-health) is responding with HTTP 200${RESET}"
else
  echo -e "${RED}✗ Replit deployment health endpoint (/replit-deploy-health) is not responding correctly. Status: $REPLIT_HEALTH_STATUS${RESET}"
fi

# Check non-browser root response
ROOT_HEALTH_CONTENT=$(curl -s -H "Accept: application/json" "http://localhost:5000/")
if [[ "$ROOT_HEALTH_CONTENT" == "OK" ]]; then
  echo -e "${GREEN}✓ Root endpoint (/) returns 'OK' for non-browser requests${RESET}"
else
  echo -e "${YELLOW}! Root endpoint (/) is not returning 'OK' for non-browser requests${RESET}"
  echo -e "${YELLOW}! This may cause issues with Replit's health checks${RESET}"
fi

echo -e "\n${BOLD}${CYAN}=== Deployment Preparation Complete ===${RESET}"
echo -e "${CYAN}Your application is now ready for deployment.${RESET}"
echo -e "${CYAN}The application has been configured with special routes for health checks:${RESET}"
echo -e "${CYAN}- /replit-deploy-health: For Replit's load balancer health checks${RESET}"
echo -e "${CYAN}- /health: For general health checks${RESET}"
echo -e "${CYAN}- /: Will serve the application for browsers but 'OK' for health checkers${RESET}"
echo -e "${CYAN}- /app: Always serves the full application${RESET}"
echo -e "\n${BOLD}${GREEN}You can now deploy your application using the Replit Deploy button.${RESET}\n"