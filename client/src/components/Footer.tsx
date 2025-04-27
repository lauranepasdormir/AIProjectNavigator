import React from "react";
import { Link } from "wouter";
import { Database, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated } = useAuth();
  
  return (
    <footer className="py-4 px-6 bg-gray-50 border-t border-gray-200 fixed bottom-0 left-0 right-0 w-full z-10">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <img 
            src="/dv-logo.png" 
            alt="Digital Village Logo" 
            className="h-8"
            onError={(e) => { console.error("Image failed to load:", e); }}
          />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="text-sm">
            {isAuthenticated ? (
              <Link href="/admin" className="text-primary hover:text-primary/80 flex items-center gap-1 transition">
                <Database className="h-3.5 w-3.5" />
                <span>Admin Panel</span>
              </Link>
            ) : (
              <Link href="/login" className="text-primary hover:text-primary/80 flex items-center gap-1 transition">
                <LogIn className="h-3.5 w-3.5" />
                <span>Admin Login</span>
              </Link>
            )}
          </div>
          <div className="text-sm text-gray-500">
            © {currentYear} Digital Village Pty Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}