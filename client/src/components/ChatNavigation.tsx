import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronsRight } from "lucide-react";

interface ChatNavigationProps {
  currentQuestion: number;
  totalQuestions: number;
  isCurrentQuestionRequired: boolean;
  onPrevious: () => void;
  onSkip: () => void;
  isInputDisabled: boolean; // Add isInputDisabled to the interface
}

export function ChatNavigation({
  currentQuestion,
  totalQuestions,
  isCurrentQuestionRequired,
  onPrevious,
  onSkip,
  isInputDisabled, // Destructure the new prop
}: ChatNavigationProps) {
  return (
    <div className="border-t border-gray-200 p-2 bg-gray-50 flex items-center justify-between">
      <div className="flex space-x-1 sm:space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={currentQuestion === 0 || isInputDisabled} // Disable when currentQuestion is 0 or AI is processing
          className="flex items-center gap-1 text-xs sm:text-sm py-1 h-8 px-2 sm:px-3"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" /> Back
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onSkip}
          disabled={isCurrentQuestionRequired || isInputDisabled} // Optionally disable Skip button too
          className="flex items-center gap-1 text-xs sm:text-sm py-1 h-8 px-2 sm:px-3"
        >
          Skip <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
      
      <div>
        <span className="text-xs sm:text-sm text-gray-500 font-medium">
          {currentQuestion + 1}/{totalQuestions}
        </span>
      </div>
    </div>
  );
}