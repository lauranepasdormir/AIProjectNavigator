// src/App.tsx
import React, { useState, useEffect, Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import SetupPage from "@/pages/SetupPage";

// lazy load the big pages
const ChatForm   = lazy(() => import("@/pages/ChatForm"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));

// eager load the small pages
import LoginPage from "@/pages/LoginPage";
import NotFound  from "@/pages/not-found";

// A contextual loading/fallback page for Suspense
function LoadingPage() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin");
  const message = isAdminRoute
    ? "Loading Admin Panel…"
    : "Loading App…";

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="animate-spin h-12 w-12 border-4 border-t-primary rounded-full mb-4"></div>
      <div className="text-lg font-medium">{message}</div>
    </div>
  );
}

function App() {
  // null = initial loading, false = setup in progress, true = ready
  const [setupReady, setSetupReady] = useState<boolean | null>(null);

  useEffect(() => {
    let intervalId: number | undefined;

    const checkStatus = () => {
      fetch("/api/setup-status")
        .then((res) => res.json())
        .then((data: { ready: boolean }) => {
          if (data.ready) {
            setSetupReady(true);
            if (intervalId) window.clearInterval(intervalId);
          } else if (setupReady === null) {
            setSetupReady(false);
          }
        })
        .catch(() => {
          if (setupReady === null) setSetupReady(false);
        });
    };

    checkStatus();
    intervalId = window.setInterval(checkStatus, 1000);
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [setupReady]);

  if (setupReady === null) {
    // initial spinner while we hit /api/setup-status
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-12 w-12 border-4 border-t-primary rounded-full"></div>
      </div>
    );
  }

  if (!setupReady) {
    return <SetupPage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen flex flex-col bg-gray-50 pb-24">
            <Header />
            <main className="flex-1">
              {/* Use our contextual LoadingPage as the Suspense fallback */}
              <Suspense fallback={<LoadingPage />}>
                <Switch>
                  <Route path="/" component={ChatForm} />
                  <Route path="/app" component={ChatForm} />
                  <Route path="/login" component={LoginPage} />
                  <ProtectedRoute path="/admin" component={AdminPanel} />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </main>
            <Footer />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
