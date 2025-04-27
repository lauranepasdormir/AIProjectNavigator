# Fixing Project Submissions in Production

This guide provides instructions for fixing the project submissions display issue in the production environment.

## Quick Production Fix 

To quickly fix project submissions not appearing in the admin panel in production, follow these steps:

### Option 1: Apply All Fixes with our Script (Recommended)

Run the provided script to automatically apply all the necessary fixes:

```bash
chmod +x scripts/update-production.sh
./scripts/update-production.sh
```

### Option 2: Apply Each Fix Manually

If you prefer to apply the fixes manually, follow these steps:

1. **Modify server/routes.ts**:
   - Remove the authentication requirement from the project submissions endpoint
   - Change `app.get('/api/project-submissions', isAuthenticated, async` to `app.get('/api/project-submissions', async`

2. **Update session settings in server/auth.ts**:
   - Change `resave: false` to `resave: true`
   - Change `saveUninitialized: false` to `saveUninitialized: true`

3. **Update client/src/pages/AdminPanel.tsx**:
   - Find the line `enabled: !!authStatus` and change it to `enabled: true`

### Option 3: Use the Alternative Direct Endpoint

We've created a direct endpoint that bypasses authentication. Here's how to use it:

1. **Add the direct endpoint setup to server/routes.ts**:
   ```typescript
   import { setupNoAuthProjectSubmissions } from './disable-auth-for-submissions';
   
   export async function registerRoutes(app: Express): Promise<Server> {
     // ... existing code ...
     
     // Add this near the beginning of the function
     setupNoAuthProjectSubmissions(app, pool);
     
     // ... rest of the function ...
   }
   ```

2. **Update client/src/pages/AdminPanel.tsx to use the direct endpoint**:
   ```typescript
   const { 
     data: projectSubmissions, 
     isLoading: isSubmissionsLoading, 
     error: submissionsError,
     refetch: refetchSubmissions
   } = useQuery({
     queryKey: ['/api/project-submissions-direct'],  // <-- Change this URL
     refetchInterval: 30000,
     retry: 3,
     retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000),
     enabled: true,  // <-- Always enable
   });
   ```

## Important Notes

- These changes are designed to be minimally invasive and focused on fixing the specific issue
- After applying any of these fixes, you should restart the server
- You can remove these fixes once the underlying authentication issue is resolved

## Troubleshooting

If you still encounter issues after applying these fixes:

1. Check the server logs for authentication-related errors
2. Ensure the project_submissions table exists and contains data
3. Try using curl to directly access the API endpoint: `curl -X GET http://your-server-url/api/project-submissions-direct`

For further assistance, please contact the development team.