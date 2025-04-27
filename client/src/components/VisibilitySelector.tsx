import { Card, CardContent } from "@/components/ui/card";
import { Lock, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisibilitySelectorProps {
  selectedVisibility: string;
  onSelectVisibility: (visibility: string) => void;
}

export function VisibilitySelector({
  selectedVisibility,
  onSelectVisibility
}: VisibilitySelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Choose project visibility:</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Private option */}
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedVisibility === "private" ? "ring-2 ring-primary" : ""
          )}
          onClick={() => onSelectVisibility("private")}
        >
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Lock className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">🔒 Private</h3>
            <p className="text-sm text-gray-600">Only visible to you and the DV Team.</p>
          </CardContent>
        </Card>
        
        {/* Internal option */}
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedVisibility === "internal" ? "ring-2 ring-primary" : ""
          )}
          onClick={() => onSelectVisibility("internal")}
        >
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Users className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">👥 Internal</h3>
            <p className="text-sm text-gray-600">Shared with other Digital Village Guild members.</p>
          </CardContent>
        </Card>
        
        {/* Public option */}
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedVisibility === "public" ? "ring-2 ring-primary" : ""
          )}
          onClick={() => onSelectVisibility("public")}
        >
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Globe className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">🌍 Public</h3>
            <p className="text-sm text-gray-600">Published on the Digital Village public website.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}