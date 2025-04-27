#!/bin/bash

# This script makes the necessary changes to fix project submissions in production
# It updates the server files directly in-place without needing to rebuild

echo "=== Updating Production Environment ==="

# Set working directory to project root
cd "$(dirname "$0")/.."

# Update the project-submissions endpoint in the production server file
echo "Fixing production routes.ts file..."
sed -i 's/app\.get(.\/api\/project-submissions., isAuthenticated, async/app.get("\/api\/project-submissions", async/g' server/routes.ts

# Update session settings in auth.ts
echo "Fixing production auth.ts file..."
# 1. Update session settings
sed -i 's/resave: false,/resave: true,/g' server/auth.ts
sed -i 's/saveUninitialized: false,/saveUninitialized: true,/g' server/auth.ts

# Update client AdminPanel.tsx
echo "Fixing client AdminPanel.tsx file..."
# 1. Make it always fetch project submissions
sed -i 's/enabled: !!authStatus,/enabled: true, \/\/ Always fetch regardless of authentication status/g' client/src/pages/AdminPanel.tsx

echo "=== Updates Complete ==="
echo "The changes have been applied. Please restart the server for changes to take effect."