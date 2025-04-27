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

# Step 4: Verify deployment readiness
echo -e "\n${YELLOW}Step 4: Verifying deployment readiness...${RESET}"
node scripts/verify-deployment-readiness.js

echo -e "\n${BOLD}${CYAN}=== Deployment Preparation Complete ===${RESET}"
echo -e "${CYAN}You can now deploy your application using the Replit Deploy button.${RESET}"
echo -e "${CYAN}The application will serve a fast health check response at the root endpoint.${RESET}"
echo -e "${CYAN}Users can access the full application at both '/' and '/app' routes.${RESET}\n"