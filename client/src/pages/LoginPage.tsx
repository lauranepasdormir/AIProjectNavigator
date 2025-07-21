import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function LoginPage() {
  // State for form fields and UI feedback
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // Redirect to admin panel if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/admin");
    }
  }, [isAuthenticated, setLocation]);

  // Main login handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic client-side validation
    if (!email || !password) {
      setError("Both email and password are required");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Attempting login with:", { username: email });

      // Send login request
      const loginResponse = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
        credentials: "include",
      });

      console.log(`Login response status: ${loginResponse.status}`);

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.error || `Login failed: ${loginResponse.status}`);
      }

      const userData = await loginResponse.json();
      console.log("Login successful, user data:", userData);

      // Show success message with green styling
      setError("Login successful! Redirecting to admin panel...");
      const messageBox = document.querySelector("div.p-3");
      messageBox?.classList.remove("bg-destructive");
      messageBox?.classList.add("bg-green-500");

      // Verify authentication state immediately after login
      const meResponse = await fetch("/api/me", {
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      if (meResponse.ok) {
        const currentUser = await meResponse.json();
        console.log("Auth verified, current user:", currentUser);

        // Force refresh of auth query
        await queryClient.invalidateQueries({ queryKey: ["/api/me"] });

        // Delayed redirect for UX
        setTimeout(() => setLocation("/admin"), 1000);
      } else {
        // Fallback: if verification fails, force redirect
        throw new Error("Login succeeded but auth verification failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Login failed");
      // Fallback redirect even if error occurs during verification
      setTimeout(() => (window.location.href = "/admin"), 1000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error or success message */}
            {error && (
              <div className="p-3 text-sm text-white bg-destructive rounded-md">
                {error}
              </div>
            )}

            {/* Email input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
