import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ToyBrick } from "lucide-react";
import { ChatMessage } from "@shared/schema";
import { questions } from "@/lib/questions";
import { generateMarkdown, formatMarkdownToHtml, downloadMarkdown } from "@/lib/markdown";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { ChatNavigation } from "@/components/ChatNavigation";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChatForm() {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<'edit' | 'preview'>('edit');
  const [isSaved, setIsSaved] = useState(false);
  const [generatingDraftForQuestion, setGeneratingDraftForQuestion] = useState<string | null>(null);
  
  // Toast notifications
  const { toast } = useToast();
  
  // Mutation to save project to database
  const submitProjectMutation = useMutation({
    mutationFn: async (projectData: Record<string, string>) => {
      const response = await apiRequest(
        'POST',
        '/api/project-submissions',
        projectData
      );
      return response.json();
    },
    onSuccess: () => {
      setIsSaved(true);
      toast({
        title: "Success!",
        description: "Your project has been saved to the database.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error('Error saving project:', error);
      toast({
        title: "Error",
        description: "Failed to save your project. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation to generate draft responses
  const generateDraftMutation = useMutation({
    mutationFn: async ({ question, context }: { question: string; context: Record<string, string> }) => {
      const response = await apiRequest(
        'POST',
        '/api/draft-suggestion',
        { question, context }
      );
      return response.json();
    },
    onSuccess: (data) => {
      addUserMessage(data.suggestion);
      setGeneratingDraftForQuestion(null);
      
      toast({
        title: "Draft Generated",
        description: "AI-generated draft has been added to the chat.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error('Error generating draft:', error);
      setGeneratingDraftForQuestion(null);
      
      toast({
        title: "Error",
        description: "Failed to generate a draft suggestion. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Refs
  const chatAreaRef = useRef<HTMLDivElement>(null);
  
  // Add initial bot message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: uuidv4(),
        type: 'bot',
        content: "Hi there! I'll help you submit information about your AI project for the showcase. Let's get started! " + questions[0].text,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);
  
  // Scroll to bottom of chat area when messages change
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Check if all questions have been answered
  const isComplete = currentQuestion >= questions.length;
  
  // Add a bot message to the chat
  const addBotMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: 'bot',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
  };
  
  // Add a user message to the chat
  const addUserMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
  };
  
  // Handle user input submission
  const handleSubmit = (value: string) => {
    // Skip empty required answers
    if (!value && questions[currentQuestion]?.required) {
      addBotMessage("This field is required. Please provide an answer.");
      return;
    }
    
    // Add user message
    addUserMessage(value);
    
    // Save answer
    const updatedAnswers = { ...answers };
    updatedAnswers[questions[currentQuestion].id] = value;
    setAnswers(updatedAnswers);
    
    // Move to next question
    setCurrentQuestion(prev => prev + 1);
    
    // If there are more questions, show the next one
    if (currentQuestion + 1 < questions.length) {
      setTimeout(() => {
        addBotMessage(questions[currentQuestion + 1].text);
      }, 500);
    } else {
      // Show completion message
      setTimeout(() => {
        addBotMessage("Thanks for providing all the information! Would you like to preview your project showcase?");
      }, 500);
    }
  };
  
  // Handle previous button click
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      addBotMessage("Let's go back to the previous question. " + questions[currentQuestion - 1].text);
    }
  };
  
  // Handle skip button click
  const handleSkip = () => {
    if (!questions[currentQuestion].required) {
      addUserMessage("Skip");
      
      const updatedAnswers = { ...answers };
      updatedAnswers[questions[currentQuestion].id] = '';
      setAnswers(updatedAnswers);
      
      setCurrentQuestion(prev => prev + 1);
      
      if (currentQuestion + 1 < questions.length) {
        setTimeout(() => {
          addBotMessage(questions[currentQuestion + 1].text);
        }, 500);
      } else {
        setTimeout(() => {
          addBotMessage("Thanks for providing all the information! Would you like to preview your project showcase?");
        }, 500);
      }
    }
  };
  
  // Show preview
  const handleShowPreview = () => {
    setIsPreviewMode(true);
  };
  
  // Return to chat
  const handleBackToChat = () => {
    setIsPreviewMode(false);
  };
  
  // Generate and download markdown
  const handleDownload = () => {
    const markdown = generateMarkdown(answers);
    const filename = `${answers.title || 'ai-project'}.md`;
    downloadMarkdown(markdown, filename);
  };
  
  // Handle updating an answer in the preview mode
  const handleUpdateAnswer = (id: string, value: string) => {
    const updatedAnswers = { ...answers };
    updatedAnswers[id] = value;
    setAnswers(updatedAnswers);
    
    // Update the markdown and HTML content to reflect the changes
    toast({
      title: "Answer Updated",
      description: "Your answer has been updated successfully.",
      variant: "default",
    });
  };
  
  // Handle view mode changes in preview
  const handleViewModeChange = (mode: 'edit' | 'preview') => {
    setPreviewViewMode(mode);
  };
  
  // Save project to database
  const handleSaveToDatabase = () => {
    submitProjectMutation.mutate(answers);
  };
  
  // Handle draft generation request
  const handleDraftRequest = (question: string) => {
    // Save the question content to track which question is being processed
    setGeneratingDraftForQuestion(question);
    
    // Generate the draft using the OpenAI API
    generateDraftMutation.mutate({
      question,
      context: answers // Pass the current answers as context
    });
  };
  
  // Generate markdown content
  const markdownContent = generateMarkdown(answers);
  const htmlContent = formatMarkdownToHtml(markdownContent);
  
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex justify-center items-center py-4 sm:py-6 md:py-8 px-2 sm:px-4 flex-grow">
        <div className="flex flex-col w-full max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Form Header */}
          <div className="px-3 py-3 sm:px-4 sm:py-4 bg-primary text-white flex items-center shadow-md">
            <ToyBrick className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            <h1 className="text-lg sm:text-xl font-semibold">Submit Your AI Project</h1>
          </div>
          
          {/* Main Content */}
          {isPreviewMode ? (
            <MarkdownPreview 
              htmlContent={htmlContent} 
              title={answers.title || 'Untitled Project'} 
              answers={answers}
              onUpdateAnswer={handleUpdateAnswer}
              initialViewMode={previewViewMode}
              onViewModeChange={handleViewModeChange}
            />
          ) : (
            <div 
              ref={chatAreaRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-h-[350px] sm:min-h-[400px] max-h-[50vh] sm:max-h-[60vh]"
            >
              {messages.map(message => (
                <ChatBubble 
                  key={message.id} 
                  message={message} 
                  onRequestDraft={!isComplete ? handleDraftRequest : undefined}
                  currentQuestion={currentQuestion}
                  isGeneratingDraft={message.content === generatingDraftForQuestion && generateDraftMutation.isPending}
                />
              ))}
            </div>
          )}
          
          {/* Navigation Area - Only show when not in preview mode */}
          {!isPreviewMode && !isComplete && (
            <ChatNavigation 
              currentQuestion={currentQuestion}
              totalQuestions={questions.length}
              isCurrentQuestionRequired={currentQuestion < questions.length && questions[currentQuestion].required}
              onPrevious={handlePrevious}
              onSkip={handleSkip}
            />
          )}
          
          {/* Input Area */}
          <div className="mt-auto">
            <ChatInput 
              placeholder={currentQuestion < questions.length ? questions[currentQuestion].placeholder : ""}
              onSubmit={handleSubmit}
              isComplete={isComplete}
              onShowPreview={handleShowPreview}
              onDownload={handleDownload}
              onSave={handleSaveToDatabase}
              onBackToChat={handleBackToChat}
              isPreviewMode={isPreviewMode}
              isSaved={isSaved}
              isSaving={submitProjectMutation.isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}