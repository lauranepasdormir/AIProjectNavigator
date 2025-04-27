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
        const res = await apiRequest("GET", "/api/me");
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
      const response = await apiRequest("POST", "/api/login", { email, password });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        
        toast({
          title: "Login successful",
          description: "You are now logged in.",
          variant: "default",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }
    } catch (error) {
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
      const response = await apiRequest("POST", "/api/logout");
      
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