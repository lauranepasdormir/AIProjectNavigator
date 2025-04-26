import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, EyeIcon, Download, ArrowLeft, Database, Mic, MicOff } from "lucide-react";

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

// Define SpeechRecognition interface for TypeScript
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

// Global variable to access the Web Speech API
// Using 'as any' to avoid TypeScript errors with browser compatibility
const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                           (window as any).webkitSpeechRecognition;

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
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof SpeechRecognitionAPI !== 'undefined') {
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      // Type assertion to avoid TypeScript errors
      recognitionInstance.onresult = ((event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => prev + ' ' + transcript.trim());
        stopListening();
      }) as any;
      
      // Type assertion to avoid TypeScript errors
      recognitionInstance.onerror = ((event: any) => {
        console.error('Speech recognition error', event.error);
        stopListening();
      }) as any;
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    } else {
      setIsVoiceSupported(false);
      console.warn('Speech recognition is not supported in this browser');
    }
    
    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, []);
  
  const startListening = () => {
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };
  
  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !isComplete) return;
    
    // Stop listening if active when submitting
    if (isListening) {
      stopListening();
    }
    
    onSubmit(inputValue.trim());
    setInputValue("");
  };
  
  if (isPreviewMode) {
    return (
      <div className="border-t p-3 sm:p-4 bg-white flex flex-col sm:flex-row justify-between shadow-inner gap-2">
        <Button
          variant="outline"
          onClick={onBackToChat}
          className="gap-2 px-3 sm:px-4 text-sm sm:text-base"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" /> Return to Chat
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={onSave}
            disabled={isSaved || isSaving}
            className="bg-primary hover:bg-primary/90 gap-2 px-3 py-2 sm:px-5 sm:py-6 text-sm sm:text-lg font-medium"
          >
            <Database className="h-4 w-4 sm:h-5 sm:w-5" /> 
            {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save Project'}
          </Button>
          
          <Button
            onClick={onDownload}
            className="bg-secondary hover:bg-secondary/90 gap-2 px-3 py-2 sm:px-5 sm:py-6 text-sm sm:text-lg font-medium"
          >
            <Download className="h-4 w-4 sm:h-5 sm:w-5" /> Download
          </Button>
        </div>
      </div>
    );
  }
  
  if (isComplete) {
    return (
      <div className="border-t p-3 sm:p-4 bg-white shadow-inner">
        <p className="text-center text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">You've completed all questions!</p>
        <Button
          onClick={onShowPreview}
          className="w-full bg-primary hover:bg-primary/90 gap-2 py-3 sm:py-6 text-base sm:text-lg font-medium"
        >
          <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" /> Show Preview
        </Button>
      </div>
    );
  }
  
  // Handle toggle of microphone
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-2 sm:p-3 bg-white flex flex-col gap-2">
      <div className="flex items-start gap-1 sm:gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={inputValue}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
            placeholder={isListening ? "Listening..." : placeholder}
            className={`w-full border ${isListening ? 'border-red-400' : 'border-gray-300'} focus:ring-2 focus:ring-primary min-h-[50px] sm:min-h-[60px] text-sm sm:text-base resize-none ${isListening ? 'pr-8' : ''}`}
            rows={2}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
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
        <div className="flex flex-col gap-1 sm:gap-2 mt-0 sm:mt-1">
          {isVoiceSupported && (
            <Button
              type="button"
              onClick={toggleListening}
              className={`${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} p-1 sm:p-2 rounded-lg`}
              title={isListening ? "Stop recording" : "Start voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          )}
          <Button type="submit" className="bg-primary hover:bg-primary/90 p-1 sm:p-2 rounded-lg">
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
      {isVoiceSupported && isListening && (
        <div className="text-center text-xs sm:text-sm text-gray-500">
          Voice input active. Speak now...
        </div>
      )}
    </form>
  );
}
