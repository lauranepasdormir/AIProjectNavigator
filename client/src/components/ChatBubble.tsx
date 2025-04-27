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
  
  // Define keywords that indicate a non-draftable message
  const noDraftButtonKeywords = [
    "preview your project",
    "project visibility",
    "congratulations",
    "digital village profile",
    "update your digital village profile",
    "would you like to update",
    "thanks for sharing your project"
  ];
  
  // Function to check if message contains any of the keywords
  const containsKeyword = (content: string) => {
    return noDraftButtonKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  // Only show the draft button for bot messages (questions) that have the draft handler
  // And only starting from the description question (index 2) onwards
  // And only for messages that don't contain any of the keywords
  const showDraftButton = isBot 
    && onRequestDraft 
    && typeof currentQuestion === 'number' 
    && currentQuestion >= 2
    && !containsKeyword(message.content);
  
  return (
    <div className={cn(
      "flex items-start mb-4",
      !isBot && "justify-end"
    )}>
      {isBot && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-white flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
          <ToyBrick className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      )}
      
      <div className={cn("flex-1 max-w-[90%] sm:max-w-[80%]", !isBot && "flex justify-end")}>
        <div className="w-full">
          <div className={cn(
            "rounded-lg p-2 sm:p-3 inline-block w-full",
            isBot ? "bg-gray-100" : "bg-primary text-white"
          )}>
            <p className="text-sm sm:text-base break-words">{message.content}</p>
            
            {showDraftButton && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700 font-medium"
                  onClick={() => onRequestDraft(message.content)}
                  disabled={isGeneratingDraft}
                >
                  {isGeneratingDraft ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin text-blue-600" />
                      <span className="truncate">Generating...</span>
                    </>
                  ) : (
                    <>
                      <LightbulbIcon className="mr-1 h-3 w-3 text-blue-600" />
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
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center ml-2 sm:ml-3 flex-shrink-0">
          <PersonStanding className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      )}
    </div>
  );
}
