import { useLocation, Link } from "wouter";
import { ToyBrick, User, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="border-b bg-white p-4 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ToyBrick className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">AI Project Showcase</span>
        </div>

        <nav className="flex space-x-2">
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

          <Button
            variant={location === "/admin" ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/admin">
              <Database className="h-4 w-4 mr-2" />
              View Submissions
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}