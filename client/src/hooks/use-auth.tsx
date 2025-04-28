import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

type LoginData = {
  email: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Get current user on mount
  const {
    data: userData,
    error,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/me");
        if (res.status === 401) {
          return null; // Not authenticated
        }
        return await res.json();
      } catch (error) {
        return null; // Handle network errors
      }
    },
    retry: false, // Don't retry if we get an auth error
  });

  useEffect(() => {
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
    } else if (!isLoading && !isError) {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [userData, isLoading, isError]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      // Input validation
      if (!email || !password) {
        throw new Error("Both email and password are required");
      }
      
      // Fix: Server expects 'username' not 'email'
      console.log("Auth hook login attempt with:", { username: email, passwordProvided: !!password });
      
      // Use a simple fetch directly here to avoid issues with cloning
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Add cache-busting headers 
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ 
          username: email, // Note: Send as username
          password 
        }),
        credentials: "include",
      });
      
      // For debugging - log the status
      console.log(`Auth hook login response status: ${response.status} ${response.statusText}`);
      
      let responseData;
      try {
        // Try to parse the response as JSON
        const clonedResponse = response.clone(); // Clone before reading body
        responseData = await response.json();
        console.log("Auth hook login response data:", responseData);
      } catch (e) {
        console.error("Error parsing login response as JSON:", e);
        // Handle non-JSON responses
        try {
          const textResponse = await response.text();
          console.log("Auth hook login response text:", textResponse);
        } catch (textError) {
          console.error("Error getting text response:", textError);
        }
        throw new Error(`Login Error (non-JSON response): ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(
          responseData.message || 
          responseData.error || 
          `Login Error: ${response.status} ${response.statusText}`
        );
      }
      
      console.log("Login successful, user data:", responseData);
      setUser(responseData);
      setIsAuthenticated(true);
      
      // Invalidate both endpoints to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-submissions-direct"] });
      
      toast({
        title: "Login successful",
        description: "You are now logged in.",
        variant: "default",
      });
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const response = await apiRequest("/api/logout", "POST");
      
      if (response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        
        toast({
          title: "Logout successful",
          description: "You have been logged out.",
          variant: "default",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Logout failed");
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error: error as Error | null,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}