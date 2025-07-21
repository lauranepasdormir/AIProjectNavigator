// src/components/ProtectedRoute.tsx

import React, { useState, useEffect } from "react";
import { Route, Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import SetupPage from "@/pages/SetupPage";
import { useAuth } from "@/hooks/use-auth";

// Props for the protected route
interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

/**
 * A route wrapper that:
 * 1. Waits for setup to complete (via `/api/setup-status`)
 * 2. Validates user authentication (via `/api/me` or useAuth)
 * 3. Redirects unauthenticated users to /login
 * 4. Displays SetupPage if setup is not complete
 */
export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  /** 1. Setup status check */
  const [setupReady, setSetupReady] = useState<boolean | null>(null);
  useEffect(() => {
    let id: number;

    const checkSetupStatus = async () => {
      try {
        const res = await fetch("/api/setup-status");
        const { ready } = await res.json();
        if (ready) {
          setSetupReady(true);
          window.clearInterval(id); // stop polling
        } else if (setupReady === null) {
          setSetupReady(false); // first failed attempt
        }
      } catch {
        if (setupReady === null) setSetupReady(false); // only mark on first failure
      }
    };

    checkSetupStatus();
    id = window.setInterval(checkSetupStatus, 1000); // poll every second
    return () => window.clearInterval(id); // cleanup
  }, [setupReady]);

  /** 2. Auth check once setup is ready */
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Skip auth check if setup is not done yet
    if (setupReady === false) return;

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          headers: { "Cache-Control": "no-cache" },
        });

        if (res.ok) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          // Slight delay before redirecting
          setTimeout(() => setLocation("/login"), 100);
        }
      } catch {
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    };

    // Fast path: already authenticated
    if (isAuthenticated) {
      setAuthorized(true);
      setChecking(false);
    } else if (!authLoading && setupReady) {
      checkAuth();
    }
  }, [isAuthenticated, authLoading, setupReady, setLocation]);

  /** 3. Conditional render logic */

  // a. Waiting for setup status
  if (setupReady === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // b. Setup incomplete
  if (!setupReady) {
    return <SetupPage />;
  }

  // c. Setup complete, still checking auth
  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // d. All checks passed → render route
  return (
    <Route path={path}>
      {authorized ? <Component /> : <Redirect to="/login" />}
    </Route>
  );
}
