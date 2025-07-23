import { cn } from "@/lib/utils";
import { ChatMessage } from "@shared/schema";
import { ToyBrick, PersonStanding, LightbulbIcon, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { questions } from "@/lib/questions";
import React from "react";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
  answers: Record<string, string>;
  onRequestDraft?: (question: string) => void;
  currentQuestion?: number;
  isGeneratingDraft?: boolean;
  messages: ChatMessage[];
  onIgnore?: () => void;
  nextQuestion?: () => void;
  onEdit?: (text: string) => void;
}

export function ChatBubble({
  message,
  answers,
  onRequestDraft,
  currentQuestion,
  isGeneratingDraft = false,
  onIgnore,
  onEdit,
  messages,
}: ChatBubbleProps) {
  const time = message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isAdvice = message.type === "advice";
  const isNext = message.type === "next";
  const isExample = message.type === "example";
  const isBot = message.type === "bot" || isAdvice || isNext || isExample;
  const isAIGenerated = message.isAIGenerated || isExample;

  const isCurrentQuestion =
    typeof currentQuestion === "number" && message.questionId === currentQuestion;

  /** Determine if action buttons should be shown */
  const noActionKeywords = [
    "preview your project",
    "project visibility",
    "congratulations",
    "digital village profile",
    "would you like to update",
    "thanks for sharing your project",
  ];

  const suppressActions = noActionKeywords.some(keyword =>
    message.content.toLowerCase().includes(keyword)
  );

  const canShowActions =
      isAdvice &&
      onRequestDraft &&
      typeof currentQuestion === "number" &&
      currentQuestion >= 1 &&
      message.questionId === currentQuestion &&
      !suppressActions &&
      (() => {
        const adviceMessages = messages.filter(
          msg => msg.type === "advice" && msg.questionId === currentQuestion
        );
        return adviceMessages.length > 0 && adviceMessages[adviceMessages.length - 1] === message;
      })();

  const showDraftButton = canShowActions;
  const showEditButton = canShowActions;
  const showIgnoreButton = canShowActions;

  return (
    <div className={cn("flex items-start mb-4", !isBot && "justify-end")}>
      {/* Bot Avatar */}
      {isBot && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-white flex items-center justify-center mr-2 sm:mr-3">
          <ToyBrick className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      )}

      <div className={cn("flex-1 max-w-[90%] sm:max-w-[80%]", !isBot && "flex justify-end")}>
        <div>
          <div
            className={cn(
              "rounded-lg p-2 sm:p-3 inline-block",
              isAIGenerated
                ? "bg-amber-50 text-gray-800"
                : isBot
                ? "bg-gray-100"
                : "bg-primary text-white"
            )}
          >
            {/* AI Example Tag + Edit */}
            {isAIGenerated && (
              <div className="mb-1 flex items-center">
                <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  AI Example
                </span>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-amber-700 hover:text-amber-900 ml-auto"
                    onClick={() => onEdit(message.content)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            )}

            {/* Main Message */}
            <p className="text-sm sm:text-base break-words">{message.content}</p>

            {/* Action Buttons (stable) */}
            {canShowActions && (
              <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-2 sm:gap-3">
                {showDraftButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700 font-medium"
                    onClick={() => {
                      if (!isGeneratingDraft) {
                        onRequestDraft?.(questions[currentQuestion]?.text ?? "");
                      }
                    }}
                    disabled={isGeneratingDraft}
                  >
                    {isGeneratingDraft ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin text-blue-600" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <LightbulbIcon className="mr-1 h-3 w-3 text-blue-600" />
                        Give me an example
                      </>
                    )}
                  </Button>
                )}

                {showEditButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700 font-medium flex items-center"
                    onClick={() =>
                      onEdit?.(answers[questions[currentQuestion]?.id] || "")
                    }
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Edit previous response
                  </Button>
                )}

                {showIgnoreButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-800 font-medium"
                    onClick={onIgnore}
                    disabled={isGeneratingDraft} // <-- disables while AI is generating
                  >
                    {isGeneratingDraft ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin text-gray-600" />
                        Generating...
                      </>
                    ) : (
                      "Ignore"
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className={cn("text-xs text-gray-500 mt-1", !isBot && "text-right")}>
            {time}
          </div>
        </div>
      </div>

      {/* User Avatar */}
      {!isBot && (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center ml-2 sm:ml-3">
          <PersonStanding className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      )}
    </div>
  );
}
