import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, EyeIcon, Download, ArrowLeft, Database } from "lucide-react";

interface ChatInputProps {
  placeholder: string;
  onSubmit: (value: string) => void;
  isComplete?: boolean;
  onShowPreview?: () => void;
  onDownload?: () => void;
  onSave?: () => void;
  onBackToChat?: () => void;
  isPreviewMode?: boolean;
  isSaved?: boolean;
  isSaving?: boolean;
}

export function ChatInput({
  placeholder,
  onSubmit,
  isComplete = false,
  onShowPreview,
  onDownload,
  onSave,
  onBackToChat,
  isPreviewMode = false,
  isSaved = false,
  isSaving = false
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !isComplete) return;
    
    onSubmit(inputValue.trim());
    setInputValue("");
  };
  
  if (isPreviewMode) {
    return (
      <div className="border-t p-4 bg-white flex flex-wrap justify-between shadow-inner gap-2">
        <Button
          variant="outline"
          onClick={onBackToChat}
          className="gap-2 px-4"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Chat
        </Button>
        
        <div className="flex gap-2">
          <Button
            onClick={onSave}
            disabled={isSaved || isSaving}
            className="bg-primary hover:bg-primary/90 gap-2 px-5 py-6 text-lg font-medium"
          >
            <Database className="h-5 w-5" /> 
            {isSaving ? 'Saving...' : isSaved ? 'Project Saved' : 'Save My Project'}
          </Button>
          
          <Button
            onClick={onDownload}
            className="bg-secondary hover:bg-secondary/90 gap-2 px-5 py-6 text-lg font-medium"
          >
            <Download className="h-5 w-5" /> Download Markdown
          </Button>
        </div>
      </div>
    );
  }
  
  if (isComplete) {
    return (
      <div className="border-t p-4 bg-white shadow-inner">
        <p className="text-center text-gray-700 mb-3">You've completed all questions!</p>
        <Button
          onClick={onShowPreview}
          className="w-full bg-primary hover:bg-primary/90 gap-2 py-6 text-lg font-medium"
        >
          <EyeIcon className="h-5 w-5" /> Show Preview
        </Button>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="border-t p-3 bg-white flex items-start gap-2">
      <Textarea
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-gray-300 focus:ring-2 focus:ring-primary min-h-[60px] resize-none"
        rows={2}
        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as FormEvent);
          }
        }}
      />
      <Button type="submit" className="bg-primary hover:bg-primary/90 p-2 rounded-lg mt-1">
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
