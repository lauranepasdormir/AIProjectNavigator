import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect, useLocation } from "wouter";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [, setLocation] = useLocation();

  // Enhanced protection strategy - check the /api/me endpoint directly
  useEffect(() => {
    async function checkAuth() {
      try {
        console.log("ProtectedRoute: Checking authentication directly...");
        const response = await fetch("/api/me", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log("ProtectedRoute: Authentication confirmed:", userData);
          setIsAuthorized(true);
        } else {
          console.log("ProtectedRoute: Not authenticated");
          setIsAuthorized(false);
          // Add a slight delay before redirecting
          setTimeout(() => {
            setLocation("/login");
          }, 100);
        }
      } catch (error) {
        console.error("ProtectedRoute: Auth check error:", error);
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    }
    
    // Only check if we don't already know from the auth context
    if (isAuthenticated) {
      console.log("ProtectedRoute: Already authenticated via context");
      setIsAuthorized(true);
      setIsChecking(false);
    } else if (!isLoading) {
      checkAuth();
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Use combined loading state
  const showLoading = isLoading || isChecking;

  return (
    <Route path={path}>
      {showLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isAuthorized ? (
        <Component />
      ) : (
        <Redirect to="/login" />
      )}
    </Route>
  );
}