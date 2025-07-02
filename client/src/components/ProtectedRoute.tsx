// src/components/ProtectedRoute.tsx
import React, { useState, useEffect } from "react";
import { Route, Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import SetupPage from "@/pages/SetupPage";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // 1) track setup-status just like in App.tsx
  const [setupReady, setSetupReady] = useState<boolean | null>(null);
  useEffect(() => {
    let id: number;
    const check = async () => {
      try {
        const res = await fetch("/api/setup-status");
        const { ready } = await res.json();
        if (ready) {
          setSetupReady(true);
          window.clearInterval(id);
        } else if (setupReady === null) {
          setSetupReady(false);
        }
      } catch {
        if (setupReady === null) setSetupReady(false);
      }
    };
    check();
    id = window.setInterval(check, 1000);
    return () => window.clearInterval(id);
  }, [setupReady]);

  // 2) enhanced auth check state
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (setupReady === false) {
      // still setting up: skip auth check
      return;
    }
    // only run auth check once setup is ready
    const doCheck = async () => {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          headers: { "Cache-Control": "no-cache" }
        });
        if (res.ok) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          // small delay before redirect
          setTimeout(() => setLocation("/login"), 100);
        }
      } catch {
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    };

    if (isAuthenticated) {
      setAuthorized(true);
      setChecking(false);
    } else if (!authLoading && setupReady) {
      doCheck();
    }
  }, [isAuthenticated, authLoading, setupReady, setLocation]);

  // 3) render logic
  // a) still waiting on setup-status?
  if (setupReady === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  // b) setup in progress → show SetupPage
  if (!setupReady) {
    return <SetupPage />;
  }
  // c) setup done but still checking auth
  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // d) finally, if authorized render the component, else redirect
  return (
    <Route path={path}>
      {authorized ? <Component /> : <Redirect to="/login" />}
    </Route>
  );
}
