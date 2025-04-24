import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PencilIcon, SaveIcon, XIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Question, questions } from "@/lib/questions";

interface MarkdownPreviewProps {
  htmlContent: string;
  title: string;
  answers?: Record<string, string>;
  onUpdateAnswer?: (id: string, value: string) => void;
}

export function MarkdownPreview({ 
  htmlContent, 
  title, 
  answers = {}, // Default to empty object to avoid undefined errors
  onUpdateAnswer 
}: MarkdownPreviewProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(onUpdateAnswer ? 'edit' : 'preview');
  
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
    }
    setEditingField(null);
  };
  
  // Find the question object by id
  const getQuestionById = (id: string): Question | undefined => {
    return questions.find(q => q.id === id);
  };
  
  // Render each answer section with edit capability
  const renderAnswerSections = () => {
    return Object.entries(answers).map(([id, value]) => {
      const question = getQuestionById(id);
      if (!question) return null;
      
      const isEditing = editingField === id;
      
      return (
        <div key={id} className="mb-6 border-b pb-4 relative group">
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
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={cancelEditing}
                >
                  <XIcon className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700">{value || <em className="text-gray-400">Not provided</em>}</p>
          )}
        </div>
      );
    });
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <Card className="mb-4 shadow-md border border-gray-100">
        <CardContent className="pt-6 px-6 pb-8">
          <h2 className="text-xl font-semibold mb-4 text-primary border-b pb-2">
            Preview of Your AI Project Showcase
          </h2>
          
          {onUpdateAnswer ? (
            <div className="prose max-w-none">
              {renderAnswerSections()}
            </div>
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
