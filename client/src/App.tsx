// src/App.tsx
import React, { Suspense, lazy, useEffect } from "react";
import { Switch, Route } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";

// lazy load the big pages
const ChatForm   = lazy(() => import("@/pages/ChatForm"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));

// eager load the small pages
import LoginPage from "@/pages/LoginPage";
import NotFound  from "@/pages/not-found";

function App() {
  // Prefetch the other lazy page in the background after initial load
  useEffect(() => {
    const preloadOther = () => {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) {
        import("@/pages/ChatForm");
      } else {
        import("@/pages/AdminPanel");
      }
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(preloadOther);
    } else {
      const id = setTimeout(preloadOther, 2000);
      return () => clearTimeout(id);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen flex flex-col bg-gray-50 pb-24">
            <Header />
            <main className="flex-1">
              <Suspense fallback={<div className="p-4">Loading…</div>}>
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
