import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronsRight } from "lucide-react";

interface ChatNavigationProps {
  currentQuestion: number;
  totalQuestions: number;
  isCurrentQuestionRequired: boolean;
  onPrevious: () => void;
  onSkip: () => void;
}

export function ChatNavigation({
  currentQuestion,
  totalQuestions,
  isCurrentQuestionRequired,
  onPrevious,
  onSkip
}: ChatNavigationProps) {
  return (
    <div className="border-t border-gray-200 p-2 bg-gray-50 flex items-center justify-between">
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={currentQuestion === 0}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onSkip}
          disabled={isCurrentQuestionRequired}
          className="flex items-center gap-1"
        >
          Skip <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div>
        <span className="text-sm text-gray-500">
          {currentQuestion + 1}/{totalQuestions}
        </span>
      </div>
    </div>
  );
}
