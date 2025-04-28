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
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated using useEffect
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/admin");
    }
  }, [isAuthenticated, setLocation]);

  const showSuccessAndRedirect = () => {
    // Add successful login message before redirect
    setError("Login successful! Redirecting to admin panel...");
    document.querySelector("div.p-3")?.classList.remove("bg-destructive");
    document.querySelector("div.p-3")?.classList.add("bg-green-500");
    
    // Delay the redirect, but use setLocation to navigate within the SPA
    // This preserves the authentication state
    setTimeout(() => {
      console.log("Redirecting to admin panel now");
      setLocation("/admin");
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Security improvement: Only allow login with explicitly provided credentials
      if (!email || !password) {
        setError("Both email and password are required");
        setIsLoading(false);
        return;
      }
      
      console.log("Attempting login with:", { username: email });
      
      // Direct fetch approach
      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json" 
          },
          body: JSON.stringify({ 
            username: email,
            password
          }),
          credentials: "include",
        });
        
        console.log(`Login response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Login successful, user data:", data);
          
          // Update auth state before redirecting by fetching fresh data
          await queryClient.invalidateQueries({ queryKey: ["/api/me"] });
          
          // Show success message after authentication state is updated
          showSuccessAndRedirect();
          return;
        }
        
        // If not successful, get error details
        const errorData = await response.json();
        throw new Error(errorData.error || `Login failed: ${response.status}`);
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Login form error:", error);
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-white bg-destructive rounded-md">
                {error}
              </div>
            )}
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