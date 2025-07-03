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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Private option */}
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md py-2",
            selectedVisibility === "private" ? "ring-2 ring-primary" : ""
          )}
          onClick={() => onSelectVisibility("private")}
        >
          <CardContent className="pt-3 flex flex-col items-center text-center">
            <Lock className="h-7 w-7 mb-2 text-primary" />
            <h3 className="text-base font-semibold mb-1">🔒 Private</h3>
            <p className="text-xs text-gray-600">Only visible to you and the DV Team.</p>
          </CardContent>
        </Card>
        
        {/* Internal option */}
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md py-2",
            selectedVisibility === "internal" ? "ring-2 ring-primary" : ""
          )}
          onClick={() => onSelectVisibility("internal")}
        >
          <CardContent className="pt-3 flex flex-col items-center text-center">
            <Users className="h-7 w-7 mb-2 text-primary" />
            <h3 className="text-base font-semibold mb-1">👥 Internal</h3>
            <p className="text-xs text-gray-600">Shared with other Digital Village Guild members.</p>
          </CardContent>
        </Card>
        
        {/* Public option */}
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md py-2",
            selectedVisibility === "public" ? "ring-2 ring-primary" : ""
          )}
          onClick={() => onSelectVisibility("public")}
        >
          <CardContent className="pt-3 flex flex-col items-center text-center">
            <Globe className="h-7 w-7 mb-2 text-primary" />
            <h3 className="text-base font-semibold mb-1">🌍 Public</h3>
            <p className="text-xs text-gray-600">Published on the Digital Village public website.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}