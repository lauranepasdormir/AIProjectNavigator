import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    // Fullscreen centered layout with light gray background
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      {/* Card container with max width for responsiveness */}
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          {/* Title and icon section */}
          <div className="flex mb-4 gap-2">
            {/* Warning icon */}
            <AlertCircle className="h-8 w-8 text-red-500" />
            {/* 404 Heading */}
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          {/* Message prompting developer to check router config */}
          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
