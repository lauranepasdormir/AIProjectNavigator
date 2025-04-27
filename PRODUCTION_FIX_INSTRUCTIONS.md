# Fixing Project Submissions in Production

This guide provides detailed instructions for fixing all issues in the production environment, including login problems and project submissions display issues.

## Quick Production Fix 

To quickly fix all issues in production, follow these steps:

### Option 1: Apply All Fixes with our Script (Recommended)

Run the provided script to automatically apply all necessary fixes:

```bash
chmod +x scripts/update-production.sh
./scripts/update-production.sh
```

### Option 2: Apply Each Fix Manually

If you prefer to apply the fixes manually, follow these steps:

#### Authentication and Login Fixes

1. **Update client/src/lib/queryClient.ts**:
   - Add response cloning to fix the "body stream already read" error
   - Update the apiRequest function with proper error handling

2. **Update client/src/hooks/use-auth.tsx**:
   - Improve login function to handle responses properly
   - Add better error handling and logging

3. **Update client/src/pages/LoginPage.tsx**:
   - Add a small delay to the login redirect to ensure state is properly updated
   - Improve error display and logging

#### Project Submissions Fixes

1. **Modify server/routes.ts**:
   - Import and use the direct endpoint setup:
   ```typescript
   import { setupNoAuthProjectSubmissions } from './disable-auth-for-submissions';
   
   export async function registerRoutes(app: Express): Promise<Server> {
     // ... existing code ...
     
     // Add this near the beginning of the function, after auth setup
     setupNoAuthProjectSubmissions(app, pool);
     
     // ... rest of the function ...
   }
   ```

2. **Update session settings in server/auth.ts**:
   - Ensure session settings are configured for persistence:
   ```typescript
   const sessionSettings: session.SessionOptions = {
     secret: process.env.SESSION_SECRET || "digital-village-secret",
     resave: true,
     saveUninitialized: true,
     cookie: { 
       secure: process.env.NODE_ENV === "production",
       maxAge: 24 * 60 * 60 * 1000, // 24 hours
       httpOnly: true,
       sameSite: 'lax'
     }
   };
   ```

3. **Update client/src/pages/AdminPanel.tsx**:
   - Use our custom implementation of the query function to directly access the endpoint:
   ```typescript
   const { 
     data: projectSubmissions, 
     isLoading: isSubmissionsLoading, 
     error: submissionsError,
     refetch: refetchSubmissions
   } = useQuery({
     queryKey: ['/api/project-submissions-direct'],
     refetchInterval: 30000,
     retry: 3,
     retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000),
     enabled: true,
     queryFn: async () => {
       // Custom fetch implementation that bypasses TanStack Query's default handler
       const res = await fetch('/api/project-submissions-direct', {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
           'Cache-Control': 'no-cache, no-store, must-revalidate',
           'Pragma': 'no-cache',
         },
         credentials: 'include'
       });
       
       if (!res.ok) {
         throw new Error(`API Error: ${res.status} ${res.statusText}`);
       }
       
       return res.json();
     }
   });
   ```

## Verify the Fixes

After applying the fixes, you can verify they're working using our test scripts:

```bash
# Test the direct API endpoint
node scripts/test-direct-endpoint.js

# Test the database connection
node scripts/test-database-direct.js
```

## Important Notes

- These changes are designed to fix both authentication issues and project submissions visibility
- Cache headers have been added to prevent stale data issues
- Error handling has been improved throughout the application
- Custom fetch implementations bypass potential issues with the default query client

## Troubleshooting

If you encounter issues after applying these fixes:

1. **Authentication Issues**:
   - Check the server logs for authentication-related errors
   - Verify session cookies are being properly set
   - Try clearing browser cache and cookies, then logging in again

2. **Data Loading Issues**:
   - Ensure the project_submissions table exists and contains data
   - Check network requests in the browser developer tools
   - Try accessing the API endpoint directly:
     ```bash
     curl -X GET http://your-server-url/api/project-submissions-direct
     ```

3. **Database Connectivity**:
   - Run the database test script:
     ```bash
     node scripts/test-database-direct.js
     ```
   - Verify that the DATABASE_URL environment variable is correctly set

For further assistance, please contact the development team.