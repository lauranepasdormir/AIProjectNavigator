import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PencilIcon, SaveIcon, XIcon, FileEditIcon, EyeIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Question, questions } from "@/lib/questions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Props definition
interface MarkdownPreviewProps {
  htmlContent: string;                        // Rendered markdown HTML
  title: string;                              // Page or card title (currently unused)
  answers?: Record<string, string>;           // User's answers mapped by question ID
  onUpdateAnswer?: (id: string, value: string) => void; // Save updated answer
  initialViewMode?: 'edit' | 'preview';       // Start in edit or preview mode
  onViewModeChange?: (mode: 'edit' | 'preview') => void; // Notify parent on mode change
}

export function MarkdownPreview({
  htmlContent,
  title,
  answers = {},
  onUpdateAnswer,
  initialViewMode = 'edit',
  onViewModeChange,
}: MarkdownPreviewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(
    initialViewMode && onUpdateAnswer ? initialViewMode : onUpdateAnswer ? 'edit' : 'preview'
  );
  const { toast } = useToast();

  // Toggle view/edit mode and notify parent if needed
  const handleViewModeChange = (newMode: 'edit' | 'preview') => {
    setViewMode(newMode);
    onViewModeChange?.(newMode);
  };

  const startEditing = (id: string, initialValue: string) => {
    setEditingField(id);
    setEditValue(initialValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
  };

  const saveEdit = (id: string) => {
    if (onUpdateAnswer) {
      onUpdateAnswer(id, editValue);
      toast({
        title: "Changes saved",
        description: "Your answer has been updated successfully.",
        variant: "default",
      });
    }
    setEditingField(null);
  };

  const getQuestionById = (id: string): Question | undefined =>
    questions.find((q) => q.id === id);

  // Renders each editable answer block
  const renderAnswerSections = () => {
    return Object.entries(answers).map(([id, value]) => {
      const question = getQuestionById(id);
      if (!question) return null;

      const isEditing = editingField === id;

      return (
        <div key={id} className="mb-6 border-b pb-4 relative group">
          {/* Question label with edit button */}
          <h3 className="font-medium text-gray-800 mb-2 flex items-center">
            {question.text}
            {!isEditing && onUpdateAnswer && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => startEditing(id, value)}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </Button>
            )}
          </h3>

          {/* Editable or read-only answer */}
          {isEditing ? (
            <div className="space-y-2">
              {value.length > 50 ? (
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full"
                  rows={4}
                />
              ) : (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full"
                />
              )}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => saveEdit(id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <SaveIcon className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditing}>
                  <XIcon className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700">
              {value || <em className="text-gray-400">Not provided</em>}
            </p>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <Card className="mb-4 shadow-md border border-gray-100">
        <CardContent className="pt-6 px-6 pb-8">
          {/* Header with mode toggle */}
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold text-primary">
              Preview of Your AI Project Showcase
            </h2>
            {onUpdateAnswer && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="view-mode" className="text-sm font-medium">
                  {viewMode === 'edit' ? (
                    <span className="flex items-center">
                      <FileEditIcon className="h-4 w-4 mr-1" /> Edit
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <EyeIcon className="h-4 w-4 mr-1" /> Rendered
                    </span>
                  )}
                </Label>
                <Switch
                  id="view-mode"
                  checked={viewMode === 'preview'}
                  onCheckedChange={(checked) =>
                    handleViewModeChange(checked ? 'preview' : 'edit')
                  }
                />
              </div>
            )}
          </div>

          {/* Main content: either editable answers or rendered markdown */}
          {onUpdateAnswer && viewMode === 'edit' ? (
            <div className="prose max-w-none">{renderAnswerSections()}</div>
          ) : (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
