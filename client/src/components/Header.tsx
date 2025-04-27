import { useLocation, Link } from "wouter";
import { ToyBrick, User, Database, Menu, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
  };

  return (
    <header className="border-b bg-white p-3 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ToyBrick className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold sm:text-xl">AI Project Showcase</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex space-x-2">
          <Button
            variant={location === "/" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/">
              <User className="h-4 w-4 mr-2" />
              Submit Project
            </Link>
          </Button>

          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
        </nav>
        
        {/* Mobile Navigation Button */}
        <div className="sm:hidden">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {menuOpen && (
        <div className="container mx-auto mt-2 sm:hidden">
          <div className="flex flex-col space-y-2 bg-white rounded-md shadow-md p-2">
            <Button
              variant={location === "/" ? "default" : "ghost"}
              size="sm"
              asChild
              className="justify-start"
              onClick={() => setMenuOpen(false)}
            >
              <Link href="/">
                <User className="h-4 w-4 mr-2" />
                Submit Project
              </Link>
            </Button>

            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}