import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, EyeIcon, Download, ArrowLeft } from "lucide-react";

interface ChatInputProps {
  placeholder: string;
  onSubmit: (value: string) => void;
  isComplete?: boolean;
  onShowPreview?: () => void;
  onDownload?: () => void;
  onBackToChat?: () => void;
  isPreviewMode?: boolean;
}

export function ChatInput({
  placeholder,
  onSubmit,
  isComplete = false,
  onShowPreview,
  onDownload,
  onBackToChat,
  isPreviewMode = false
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
      <div className="border-t p-4 bg-white flex justify-between shadow-inner">
        <Button
          variant="outline"
          onClick={onBackToChat}
          className="gap-2 px-4"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Chat
        </Button>
        
        <Button
          onClick={onDownload}
          className="bg-secondary hover:bg-secondary/90 gap-2 px-5 py-6 text-lg font-medium"
        >
          <Download className="h-5 w-5" /> Download Markdown
        </Button>
      </div>
    );
  }
  
  // Debug logging
  console.log("Chat input isComplete:", isComplete);
  
  if (isComplete) {
    return (
      <div className="border-t p-4 bg-white shadow-inner">
        <p className="text-center text-gray-700 mb-3">You've completed all questions!</p>
        <Button
          onClick={onShowPreview}
          className="w-full bg-secondary hover:bg-secondary/90 gap-2 py-6 text-lg font-medium"
        >
          <EyeIcon className="h-5 w-5" /> Show Preview
        </Button>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="border-t p-3 bg-white flex items-center gap-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-gray-300 focus:ring-2 focus:ring-primary"
      />
      <Button type="submit" className="bg-primary hover:bg-primary/90 p-2 rounded-lg">
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
