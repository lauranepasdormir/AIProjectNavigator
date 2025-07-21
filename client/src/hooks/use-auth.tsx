import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import { useQuery } from "@tanstack/react-query";
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

export const AuthContext = createContext<AuthContextType | null>(null);

// Provider wrapper
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  /** 1. React Query - fetch current session user */
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
        return res.status === 401 ? null : await res.json();
      } catch {
        return null; // network failure
      }
    },
    retry: false,
  });

  /** 2. Update local state from server response */
  useEffect(() => {
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
      sessionStorage.setItem("isAuthenticated", "true");
      sessionStorage.setItem("user", JSON.stringify(userData));
    } else if (!isLoading && !isError) {
      setUser(null);
      setIsAuthenticated(false);
      sessionStorage.removeItem("isAuthenticated");
      sessionStorage.removeItem("user");
    }
  }, [userData, isLoading, isError]);

  /** 3. Restore from sessionStorage if available */
  useEffect(() => {
    const storedAuth = sessionStorage.getItem("isAuthenticated");
    const storedUser = sessionStorage.getItem("user");

    if (storedAuth === "true" && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        // Trigger fresh fetch
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      } catch (e) {
        console.error("Error restoring session:", e);
        sessionStorage.clear();
      }
    }
  }, []);

  /** 4. Login logic */
  const login = async (email: string, password: string) => {
    try {
      if (!email || !password) {
        throw new Error("Both email and password are required");
      }

      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        body: JSON.stringify({
          username: email,
          password,
        }),
      });

      // Parse response
      const data = await response
        .clone()
        .json()
        .catch(async () => await response.text());

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Login failed. Please try again."
        );
      }

      // Update local state
      setUser(data);
      setIsAuthenticated(true);
      sessionStorage.setItem("isAuthenticated", "true");
      sessionStorage.setItem("user", JSON.stringify(data));

      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/project-submissions-direct"],
      });

      toast({
        title: "Login successful",
        description: "You are now logged in.",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  /** 5. Logout logic */
  const logout = async () => {
    try {
      const res = await apiRequest("/api/logout", "POST");

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Logout failed");
      }

      setUser(null);
      setIsAuthenticated(false);
      sessionStorage.clear();

      queryClient.invalidateQueries({ queryKey: ["/api/me"] });

      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
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

// Hook to access auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
