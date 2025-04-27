import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ToyBrick, Database, Download } from "lucide-react";
import { ChatMessage } from "@shared/schema";
import { questions } from "@/lib/questions";
import { generateMarkdown, formatMarkdownToHtml, downloadMarkdown } from "@/lib/markdown";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { ChatNavigation } from "@/components/ChatNavigation";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { VisibilitySelector } from "@/components/VisibilitySelector";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function ChatForm() {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(-1); // Start with -1 to show intro first
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<'edit' | 'preview'>('edit');
  const [isSaved, setIsSaved] = useState(false);
  const [generatingDraftForQuestion, setGeneratingDraftForQuestion] = useState<string | null>(null);
  const [onboardingStage, setOnboardingStage] = useState<'welcome' | 'purpose' | 'questions' | 'visibility'>('welcome');
  const [selectedVisibility, setSelectedVisibility] = useState<string>("private"); // Default to private
  
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
  
  // Load saved answers from localStorage on mount and set initial message
  useEffect(() => {
    // Add initial welcome message if none exists
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: uuidv4(),
        type: 'bot',
        content: "Hi! Glad you made it here. Thanks for taking the time to share some info about a project you worked on.",
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
    }
    
    // Load saved answers from localStorage if available
    try {
      const savedAnswers = localStorage.getItem('projectAnswers');
      if (savedAnswers) {
        const parsedAnswers = JSON.parse(savedAnswers);
        setAnswers(parsedAnswers);
        
        // If visibility was saved, restore it
        if (parsedAnswers.visibility) {
          setSelectedVisibility(parsedAnswers.visibility);
        }
      }
    } catch (error) {
      console.error('Error loading answers from localStorage:', error);
    }
  }, [messages.length]);
  
  // Handle onboarding stages
  const proceedToNextOnboardingStage = () => {
    if (onboardingStage === 'welcome') {
      setOnboardingStage('purpose');
      setTimeout(() => {
        addBotMessage("The purpose of this is to share your project experience with prospective customers to showcase your capabilities and expertise. In this way, we can better connect you with new opportunities.");
      }, 500);
    } else if (onboardingStage === 'purpose') {
      setOnboardingStage('questions');
      setCurrentQuestion(0);
      setTimeout(() => {
        addBotMessage(questions[0].text);
      }, 500);
    }
  };
  
  // Scroll to bottom of chat area when messages change
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Check if all questions have been answered and visibility is selected
  const isComplete = (onboardingStage === 'questions' && currentQuestion >= questions.length) || onboardingStage === 'visibility';
  
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
    // Add user message
    addUserMessage(value);
    
    // If we're in the onboarding stages, proceed to the next stage
    if (onboardingStage !== 'questions') {
      proceedToNextOnboardingStage();
      return;
    }
    
    // Skip empty required answers for questions
    if (!value && currentQuestion >= 0 && questions[currentQuestion]?.required) {
      addBotMessage("This field is required. Please provide an answer.");
      return;
    }
    
    // Save answer
    if (currentQuestion >= 0) {
      const updatedAnswers = { ...answers };
      updatedAnswers[questions[currentQuestion].id] = value;
      setAnswers(updatedAnswers);
      
      // Save answers to localStorage
      try {
        localStorage.setItem('projectAnswers', JSON.stringify(updatedAnswers));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      
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
    if (currentQuestion >= 0 && currentQuestion < questions.length && !questions[currentQuestion].required) {
      addUserMessage("Skip");
      
      const updatedAnswers = { ...answers };
      updatedAnswers[questions[currentQuestion].id] = '';
      setAnswers(updatedAnswers);
      
      // Save answers to localStorage
      try {
        localStorage.setItem('projectAnswers', JSON.stringify(updatedAnswers));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      
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
    
    // Save to localStorage
    try {
      localStorage.setItem('projectAnswers', JSON.stringify(updatedAnswers));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
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
    // Make sure visibility is included in the submission
    const answersWithVisibility = {
      ...answers,
      visibility: selectedVisibility
    };
    
    // Save to localStorage
    try {
      localStorage.setItem('projectAnswers', JSON.stringify(answersWithVisibility));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    // Save to database
    submitProjectMutation.mutate(answersWithVisibility);
    
    // Update local state
    setAnswers(answersWithVisibility);
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
          
          {/* Navigation Area - Only show when not in preview mode and in questions stage */}
          {!isPreviewMode && !isComplete && onboardingStage === 'questions' && currentQuestion >= 0 && (
            <ChatNavigation 
              currentQuestion={currentQuestion}
              totalQuestions={questions.length}
              isCurrentQuestionRequired={currentQuestion < questions.length && questions[currentQuestion].required}
              onPrevious={handlePrevious}
              onSkip={handleSkip}
            />
          )}
          
          {/* Visibility Selector - Only show in visibility stage */}
          {!isPreviewMode && onboardingStage === 'visibility' && (
            <div className="p-3 sm:p-4 md:p-6">
              <VisibilitySelector
                selectedVisibility={selectedVisibility}
                onSelectVisibility={(visibility) => {
                  setSelectedVisibility(visibility);
                  
                  // Update answers with visibility
                  const updatedAnswers = { ...answers, visibility };
                  setAnswers(updatedAnswers);
                  
                  // Store answers in localStorage
                  try {
                    localStorage.setItem('projectAnswers', JSON.stringify(updatedAnswers));
                  } catch (error) {
                    console.error('Error saving to localStorage:', error);
                  }
                  
                  toast({
                    title: "Visibility set",
                    description: `Your project visibility has been set to ${visibility}`,
                    variant: "default",
                  });
                }}
              />
              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={handleShowPreview}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-base font-medium rounded-lg"
                >
                  Preview Project
                </Button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="mt-auto">
            {onboardingStage === 'welcome' && (
              <div className="border-t p-3 sm:p-4 bg-white shadow-inner">
                <div className="flex justify-center">
                  <Button
                    onClick={() => handleSubmit("I'm ready to proceed")}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-base sm:text-lg font-medium rounded-lg"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
            
            {onboardingStage === 'purpose' && (
              <div className="border-t p-3 sm:p-4 bg-white shadow-inner">
                <div className="flex justify-center">
                  <Button
                    onClick={() => handleSubmit("Let's get started")}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-base sm:text-lg font-medium rounded-lg"
                  >
                    Let's Get Started
                  </Button>
                </div>
              </div>
            )}
            
            {onboardingStage === 'questions' && !isPreviewMode && (
              <ChatInput 
                placeholder={currentQuestion >= 0 && currentQuestion < questions.length ? questions[currentQuestion].placeholder : ""}
                onSubmit={handleSubmit}
                isComplete={isComplete}
                onShowPreview={
                  currentQuestion >= questions.length
                    ? () => {
                        // When all questions are answered, move to visibility selection
                        setOnboardingStage('visibility');
                        addBotMessage("Please select your project visibility:");
                      }
                    : undefined
                }
                onDownload={handleDownload}
                onSave={handleSaveToDatabase}
                onBackToChat={handleBackToChat}
                isPreviewMode={false}
                isSaved={isSaved}
                isSaving={submitProjectMutation.isPending}
              />
            )}
            
            {/* Input area for preview mode */}
            {isPreviewMode && (
              <ChatInput 
                placeholder=""
                onSubmit={() => {}}
                isComplete={true}
                onShowPreview={undefined}
                onDownload={handleDownload}
                onSave={handleSaveToDatabase}
                onBackToChat={handleBackToChat}
                isPreviewMode={true}
                isSaved={isSaved}
                isSaving={submitProjectMutation.isPending}
              />
            )}
            
            {/* Additional buttons for visibility stage to submit and download */}
            {!isPreviewMode && onboardingStage === 'visibility' && (
              <div className="border-t p-3 sm:p-4 bg-white shadow-inner">
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button
                    onClick={handleSaveToDatabase}
                    disabled={isSaved || submitProjectMutation.isPending}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-base font-medium rounded-lg flex items-center gap-2"
                  >
                    <Database className="h-5 w-5" />
                    {submitProjectMutation.isPending ? 'Saving...' : isSaved ? 'Saved' : 'Submit Project'}
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-secondary hover:bg-secondary/90 text-base font-medium rounded-lg flex items-center gap-2"
                  >
                    <Download className="h-5 w-5" />
                    Download Markdown
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}