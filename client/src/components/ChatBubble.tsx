import { cn } from "@/lib/utils";
import { ChatMessage } from "@shared/schema";
import { ToyBrick, PersonStanding } from "lucide-react";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isBot = message.type === 'bot';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
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
