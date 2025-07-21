import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, EyeIcon, Download, ArrowLeft, Database, Mic, MicOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Props for ChatInput component
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
  disabled?: boolean;
  onEditInput?: (fn: (text: string) => void) => void;
}

// TypeScript interfaces for Web Speech API events
interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
}

// Support for Chrome / Safari
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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
  isSaving = false,
  disabled = false,
  onEditInput,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);

  // Initialize Web Speech API recognition instance
  useEffect(() => {
    if (typeof SpeechRecognitionAPI !== "undefined") {
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = ((event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => prev + " " + transcript.trim());
        stopListening();
      }) as any;

      recognitionInstance.onerror = ((event: any) => {
        console.error("Speech recognition error", event.error);
        stopListening();
      }) as any;

      recognitionInstance.onend = () => setIsListening(false);

      setRecognition(recognitionInstance);
    } else {
      setIsVoiceSupported(false);
      console.warn("Speech recognition not supported in this browser.");
    }

    return () => recognition?.abort();
  }, []);

  // Allow parent to edit the input
  useEffect(() => {
    onEditInput?.((text) => setInputValue(text));
  }, [onEditInput]);

  const startListening = () => {
    if (recognition && !disabled) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting voice input:", error);
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    isListening ? stopListening() : startListening();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || disabled) return;
    if (isListening) stopListening();
    onSubmit(inputValue.trim());
    setInputValue("");
  };

  // PREVIEW MODE UI
  if (isPreviewMode) {
    return (
      <div className="border-t p-3 sm:p-4 bg-white flex flex-col justify-end shadow-inner gap-3 w-full">
        <Button
          variant="outline"
          onClick={onBackToChat}
          className="bg-primary text-white hover:bg-primary/90 hover:text-white gap-2 py-2 px-4 text-base sm:text-base self-start rounded-lg"
          disabled={disabled}
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" /> Return to Chat
        </Button>
      </div>
    );
  }

  // CONSENT MODE UI (after isComplete)
  if (isComplete) {
    const [isChecked, setIsChecked] = useState(false);

    return (
      <div className="border-t p-2 sm:p-4 bg-white shadow-inner">
        <label className="flex items-start gap-2 mb-3 px-4 sm:px-3">
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => setIsChecked(!!checked)}
            id="consent-checkbox"
            className="mt-0.5"
            disabled={disabled}
          />
          <p className="text-gray-800 text-xs sm:text-sm">
            By submitting your project here, you grant permission for it to be shared internally
            with Digital Village members and externally with our extended network of partners...
            <span className="text-red-500">*</span>
          </p>
        </label>
        <div className="flex justify-center">
          <Button
            onClick={onShowPreview}
            disabled={!isChecked || disabled}
            className="px-6 py-3 bg-primary hover:bg-primary/90 gap-2 text-base sm:text-lg font-medium rounded-lg"
          >
            Proceed
          </Button>
        </div>
      </div>
    );
  }

  // DEFAULT CHAT INPUT UI
  return (
    <form
      onSubmit={handleSubmit}
      className="border-t p-2 sm:p-3 bg-white flex flex-col gap-2"
    >
      {/* Input Field */}
      <div className="relative w-full">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isListening ? "Listening..." : placeholder}
          rows={2}
          className={`w-full border ${isListening ? "border-red-400" : "border-gray-300"
            } focus:ring-2 focus:ring-primary min-h-[50px] sm:min-h-[60px] text-sm sm:text-base resize-none ${isListening ? "pr-8" : ""
            }`}
          disabled={disabled || isListening}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !disabled) {
              e.preventDefault();
              handleSubmit(e as unknown as FormEvent);
            }
          }}
        />
        {isListening && (
          <div className="absolute right-2 top-2 flex items-center justify-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mt-1">
        {isVoiceSupported && (
          <Button
            type="button"
            onClick={toggleListening}
            className={`${isListening
              ? "bg-red-500 hover:bg-red-600"
              : "bg-primary hover:bg-primary/90"
              } p-2 h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center`}
            title={isListening ? "Stop recording" : "Start voice input"}
            disabled={disabled}
          >
            {isListening ? (
              <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
        )}
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 p-2 h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center"
          disabled={disabled || !inputValue.trim()}
        >
          <Send className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </div>

      {/* Voice Input Status */}
      {isVoiceSupported && isListening && (
        <div className="text-right text-xs sm:text-sm text-red-500 font-medium">
          Voice input active. Speak now...
        </div>
      )}
    </form>
  );
}
