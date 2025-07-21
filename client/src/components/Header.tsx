import { Link } from "wouter";
import { ToyBrick, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

// Header component with logo, navigation, and authentication-based menu
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  // Handles logout and closes the mobile menu
  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
  };

  return (
    <header className="border-b bg-white p-3 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo and Title */}
        <Link
          href="/"
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <ToyBrick className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold sm:text-xl">AI Project Showcase</span>
        </Link>

        {/* Desktop Navigation: visible on sm+ */}
        <nav className="hidden sm:flex space-x-2">
          {isAuthenticated && (
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
        </nav>

        {/* Mobile Menu Button: visible only if authenticated */}
        {isAuthenticated && (
          <div className="sm:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Navigation Dropdown */}
      {menuOpen && (
        <div className="container mx-auto mt-2 sm:hidden">
          <div className="flex flex-col space-y-2 bg-white rounded-md shadow-md p-2">
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