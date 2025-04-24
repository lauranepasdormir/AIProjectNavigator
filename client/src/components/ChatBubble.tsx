import { cn } from "@/lib/utils";
import { ChatMessage } from "@shared/schema";
import { ToyBrick, PersonStanding, LightbulbIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatBubbleProps {
  message: ChatMessage;
  onRequestDraft?: (question: string) => void;
  currentQuestion?: number;
  isGeneratingDraft?: boolean;
}

export function ChatBubble({ 
  message, 
  onRequestDraft, 
  currentQuestion,
  isGeneratingDraft = false 
}: ChatBubbleProps) {
  const isBot = message.type === 'bot';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Only show the draft button for bot messages (questions) that have the draft handler
  const showDraftButton = isBot && onRequestDraft && typeof currentQuestion === 'number';
  
  return (
    <div className={cn(
      "flex items-start mb-4",
      !isBot && "justify-end"
    )}>
      {isBot && (
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mr-3 flex-shrink-0">
          <ToyBrick className="h-5 w-5" />
        </div>
      )}
      
      <div className={cn("flex-1", !isBot && "flex justify-end")}>
        <div>
          <div className={cn(
            "rounded-lg p-3 inline-block max-w-[85%]",
            isBot ? "bg-gray-100" : "bg-primary text-white"
          )}>
            <p>{message.content}</p>
            
            {showDraftButton && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => onRequestDraft(message.content)}
                  disabled={isGeneratingDraft}
                >
                  {isGeneratingDraft ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Generating suggestion...
                    </>
                  ) : (
                    <>
                      <LightbulbIcon className="mr-1 h-3 w-3" />
                      Help me draft this
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          <div className={cn(
            "text-xs text-gray-500 mt-1",
            !isBot && "text-right"
          )}>
            {time}
          </div>
        </div>
      </div>
      
      {!isBot && (
        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center ml-3 flex-shrink-0">
          <PersonStanding className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
