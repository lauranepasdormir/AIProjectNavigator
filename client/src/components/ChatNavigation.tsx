import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronsRight } from "lucide-react";

// Props for ChatNavigation component
interface ChatNavigationProps {
  currentQuestion: number;           // Index of the current question (0-based)
  totalQuestions: number;            // Total number of questions
  isCurrentQuestionRequired: boolean;// Whether the current question must be answered before skipping
  onPrevious: () => void;            // Callback for "Back" button
  onSkip: () => void;                // Callback for "Skip" button
  isInputDisabled: boolean;          // Whether inputs should be temporarily disabled (e.g., while generating)
}

// Component for navigating between chat steps/questions
export function ChatNavigation({
  currentQuestion,
  totalQuestions,
  isCurrentQuestionRequired,
  onPrevious,
  onSkip,
  isInputDisabled,
}: ChatNavigationProps) {
  return (
    <div className="border-t border-gray-200 p-2 bg-gray-50 flex items-center justify-between">
      {/* Navigation Buttons */}
      <div className="flex space-x-1 sm:space-x-2">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={currentQuestion === 0 || isInputDisabled}
          className="flex items-center gap-1 text-xs sm:text-sm py-1 h-8 px-2 sm:px-3"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          Back
        </Button>

        {/* Skip Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSkip}
          disabled={isCurrentQuestionRequired || isInputDisabled}
          className="flex items-center gap-1 text-xs sm:text-sm py-1 h-8 px-2 sm:px-3"
        >
          Skip
          <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Progress Display */}
      <div>
        <span className="text-xs sm:text-sm text-gray-500 font-medium">
          {currentQuestion + 1}/{totalQuestions}
        </span>
      </div>
    </div>
  );
}
