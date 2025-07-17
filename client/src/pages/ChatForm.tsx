import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ToyBrick, Database, Download, Link2, Clock } from "lucide-react";
import { ChatMessage } from "@shared/schema";
import { questions } from "@/lib/questions";
import { evalCriteria } from "@/lib/evalCriteria";
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
import { index } from "drizzle-orm/mysql-core";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ChatForm() {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(-1); // Start with -1 to show intro first
  const [currentCriteria, setCurrentCriteria] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<'edit' | 'preview'>('edit');
  const [isSaved, setIsSaved] = useState(false);
  const [generatingDraftForQuestion, setGeneratingDraftForQuestion] = useState<string | null>(null);
  const [onboardingStage, setOnboardingStage] = useState<'welcome' | 'purpose' | 'questions' | 'visibility' | 'success' | 'profile'>('welcome');
  const [selectedVisibility, setSelectedVisibility] = useState<string>("private"); // Default to private
  const [profileChoice, setProfileChoice] = useState<'yes' | 'later' | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [draftResponse, setDraftResponse] = useState<string | null>(null);
  const lastUserInputRef = useRef<string | null>(null);
  
  // Clear all project data from localStorage and reset state
  const clearProjectData = () => {
    // Ask for confirmation before clearing data
    if (window.confirm("Are you sure you want to start a new project? This will clear all your current project data.")) {
      // Clear localStorage
      localStorage.removeItem('projectAnswers');
      
      // Reset state
      setAnswers({});
      setMessages([]);
      setCurrentQuestion(-1);
      setCurrentCriteria(0);
      setIsPreviewMode(false);
      setPreviewViewMode('edit');
      setIsSaved(false);
      setGeneratingDraftForQuestion(null);
      setOnboardingStage('welcome');
      setSelectedVisibility("private");
      setProfileChoice(null);
      
      // Add initial welcome message
      setTimeout(() => {
        const welcomeMessage: ChatMessage = {
          id: uuidv4(),
          type: 'bot',
          content: "Hi! Glad you made it here. Thanks for taking the time to share some info about a project you worked on.",
          timestamp: new Date(),
          questionId: currentQuestion
        };
        setMessages([welcomeMessage]);
      }, 100);
      
      // Show success message
      toast({
        title: "Project Reset",
        description: "Started a new project. All previous data has been cleared.",
        variant: "default",
      });
    }
  };

  useEffect(() => {
    clearProjectData();
  }, []);
    
  // Toast notifications
  const { toast } = useToast();
  
  // Mutation to save project to database
  const submitProjectMutation = useMutation({
    mutationFn: async (projectData: Record<string, string>) => {
      const response = await apiRequest(
        '/api/project-submissions',
        'POST',
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
    mutationFn: async ({ question, evalCriteria, context }: { question: string; evalCriteria: string, context: Record<string, string> }) => {
      const response = await apiRequest(
        '/api/draft-suggestion',
        'POST',
        { question, evalCriteria, context }
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Add bot message with isAIGenerated flag set to true
      addExampleMessage(data.suggestion);
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
      
      let errorMessage = "Failed to generate a draft suggestion. Please try again.";
      
      // Try to extract a more specific error message if available
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (error && typeof error === 'object') {
        // Safe way to convert any object to string
        try {
          errorMessage = String(error) || errorMessage;
        } catch (e) {
          console.error("Could not convert error to string:", e);
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
        timestamp: new Date(),
        questionId: currentQuestion
      };
      
      setMessages([welcomeMessage]);
    }
    
    // Load saved answers from localStorage if available
    try {
      const savedAnswers = localStorage.getItem('projectAnswers');
      if (savedAnswers) {
        console.log(answers);
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
  // Welcome + 2s + Purpose
  useEffect(() => {
    if (onboardingStage === 'welcome') {
      const timeout = setTimeout(() => {
        setOnboardingStage('purpose');
        addBotMessage("The purpose of this is to share your project experience with prospective customers to showcase your capabilities and expertise. In this way, we can better connect you with new opportunities.");
      }, 2000); 

      return () => clearTimeout(timeout); 
    }
  }, [onboardingStage]);

  
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
      timestamp: new Date(),
      questionId: currentQuestion
    };
    
    setMessages(prev => [...prev, newMessage]);
  };


  // Add a bot message to the chat
  const addAdviceMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: 'advice',
      content,
      timestamp: new Date(),
      questionId: currentQuestion
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const addExampleMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: 'example',
      content,
      timestamp: new Date(),
      isAIGenerated: true,
      questionId: currentQuestion
    };
    
    setMessages(prev => [...prev, newMessage]);
  };
  
  // Add a user message to the chat
  const addUserMessage = (content: string, isAIGenerated: boolean = false) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: new Date(),
      questionId: currentQuestion
    };
    
    setMessages(prev => [...prev, newMessage]);
  };


  const addNextMessage = (content: string, isAIGenerated: boolean = false) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      type: 'next',
      content,
      timestamp: new Date(),
      questionId: currentQuestion
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  // Go to next question directly without advice
  const nextQuestion = (userInput: string, question: (typeof questions)[number]): string => {
    return `Great! Let's move on.`;
  };

  // Generate advice
  const generateAdvice = async (
    userInput: string,
    questionObj: (typeof questions)[number],
    context: Record<string, string>
  ): Promise<string> => {
    // Find the criteria text for this question
    const criteriaObj = evalCriteria.find(c => c.question === questionObj.id);
    const criteriaText = criteriaObj?.text || "";

    try {
      const response = await apiRequest(
        '/api/evaluate-answer',
        'POST',
        {
          question: questionObj.text,
          answer: userInput,
          evalCriteria: criteriaText,
          context
        }
      );
      const data = await response.json();
      // Return the AI's feedback as advice
      console.log("AI feedback:", data.feedback);
      return data.feedback || "Thanks for your response!";
    } catch (error) {
      console.error("Error generating advice:", error);
      return "Sorry, I couldn't generate advice at this time.";
    }
  };

  const [showNextButton, setShowNextButton] = useState(false);
  // User ignores recommendations or example given and goes to the next question
  const handleNextQuestion = () => {
    setCurrentQuestion(prev => prev + 1);
    if (currentQuestion + 1 < questions.length) {
      setTimeout(() => {
        addBotMessage(questions[currentQuestion + 1].text);
      }, 500);
    } else {
      // Show completion message
      setTimeout(() => {
        addBotMessage("Thanks for providing all the information!");
      }, 500);
    }
    setShowNextButton(false);
  };

const handleIgnoreButton = () => {
  addNextMessage("Ok, let's move on.");

  if (currentQuestion >= 0 && currentQuestion < questions.length) {
    const questionId = questions[currentQuestion].id;
    const lastUserInput = lastUserInputRef.current ?? "";

    const updatedAnswers = { ...answers, [questionId]: lastUserInput };
    setAnswers(updatedAnswers);

    try {
      localStorage.setItem('projectAnswers', JSON.stringify(updatedAnswers));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }

  }

  // Proceed to next question
  setCurrentQuestion(prev => prev + 1);
  if (currentQuestion + 1 < questions.length) {
    setTimeout(() => {
      addBotMessage(questions[currentQuestion + 1].text);
    }, 500);
  } else {
    // Show completion message
      setTimeout(() => {
        addBotMessage("Thanks for providing all the information!");
      }, 500);
  }
  setShowNextButton(false);

   editInput("");

  };
  
  const handleSubmit = async (value: string) => {
    addUserMessage(value);
    lastUserInputRef.current = value;

    if (onboardingStage !== 'questions') {
      proceedToNextOnboardingStage();
      return;
    }

    if (!value && currentQuestion >= 0 && questions[currentQuestion]?.required) {
      addBotMessage("This field is required. Please provide an answer.");
      return;
    }

    if (currentQuestion >= 0) {
      // Find the criteria text for this question
      const questionId = questions[currentQuestion]?.id;
      const updatedAnswers = { ...answers, [questionId]: value };
      setAnswers(updatedAnswers);
      try {
        localStorage.setItem('projectAnswers', JSON.stringify(updatedAnswers));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }

      const criteriaObj = evalCriteria.find(c => c.question === questionId);
      const criteriaText = criteriaObj?.text || "";

      // Evaluate the answer with the backend/AI
      const { feedback, satisfied } = await evaluateAnswerMutation.mutateAsync({
        question: questions[currentQuestion].text,
        answer: value,
        evalCriteria: criteriaText,
        context: answers
      });

      const isLastQuestion = currentQuestion === questions.length - 1;

      if (satisfied || isLastQuestion) {
          // Advance to next question or completion
          setCurrentQuestion(currentQuestion + 1);
          setCurrentCriteria(prev => prev + 1);

          if (!isLastQuestion) {
              const affirmation = await generateAdvice(value, questions[currentQuestion], answers);
              addAdviceMessage(affirmation);
              setTimeout(() => {
                  addBotMessage(questions[currentQuestion + 1].text);
              }, 500);
          } else {
              setTimeout(() => {
                  addBotMessage("Thanks for providing all the information!");
              }, 500);
          }
      } else {
          // Provide advice without incrementing
          const advice = await generateAdvice(value, questions[currentQuestion], answers);
          addAdviceMessage(advice);
      }


    }
  };

    // edit input by copying pervious messages
    const editInputRef = useRef<((text: string) => void) | null>(null);

    const editInput = (text: string) => {
      if (editInputRef.current) {
        editInputRef.current(text);
      }
    };

    
    // Handle previous button click
    const handlePrevious = () => {
      if (currentQuestion > 0) {
        setCurrentQuestion(prev => prev - 1);
        setCurrentCriteria(prev => prev - 1);
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
      setCurrentCriteria(prev => prev + 1);
      
      if (currentQuestion + 1 < questions.length) {
        setTimeout(() => {
          addBotMessage(questions[currentQuestion + 1].text);
        }, 500);
      } else {
        setTimeout(() => {
          addBotMessage("Thanks for providing all the information!");
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
    submitProjectMutation.mutate(answersWithVisibility, {
      onSuccess: () => {
        // After successful submission, move to success stage
        setOnboardingStage('success');
        setTimeout(() => {
          addBotMessage("🎉 Congratulations! Your project has been successfully submitted to Digital Village!");
          setTimeout(() => {
            addBotMessage("Your Digital Village profile is what clients see alongside your projects. A complete profile leads to stronger client impressions and more opportunities.");
            setTimeout(() => {
              addBotMessage("Would you like to update your Digital Village profile now?");
              setOnboardingStage('profile');
            }, 1000);
          }, 1500);
        }, 500);
      }
    });
    
    // Update local state
    setAnswers(answersWithVisibility);
  };
  
  // Handle profile choice (Yes or Later)
  const handleProfileChoice = (choice: 'yes' | 'later') => {
    setProfileChoice(choice);
    
    if (choice === 'yes') {
      addUserMessage("Yes, take me there!");
      setTimeout(() => {
        addBotMessage("Great choice! I'm opening the Digital Village Network App for you now. You'll be able to update your profile there.");
        // Open Digital Village profile in a new tab
        window.open('https://digitalvillage.app/', '_blank');
      }, 500);
    } else {
      addUserMessage("Maybe later.");
      setTimeout(() => {
        addBotMessage("No problem! Remember you can update your Digital Village profile anytime to enhance your visibility to clients. Thanks for sharing your project with us!");
      }, 500);
    }
  };
  
  // Handle draft generation request
  const handleDraftRequest = (question: string) => {
  setGeneratingDraftForQuestion(question);

  // Find the criteria object that matches the current question's id
  const questionId = questions[currentQuestion]?.id;
  const criteriaObj = evalCriteria.find(c => c.question === questionId);

  // Use the .text property if found, otherwise fallback to empty string
  const criteriaText = criteriaObj?.text || "";

  console.log("Sending draft request with context:", JSON.stringify(answers, null, 2));
  console.log("Sending evalCriteria:", criteriaText);

  generateDraftMutation.mutate({
    question,
    evalCriteria: criteriaText,
    context: answers
  });
};

  const evaluateAnswerMutation = useMutation({
    mutationFn: async ({ question, answer, evalCriteria, context }: { question: string; answer: string; evalCriteria: string; context: Record<string, string> }) => {
      const response = await apiRequest(
        '/api/evaluate-answer',
        'POST',
        { question, answer, evalCriteria, context }
      );
      return response.json();
    }
  });  

  // Generate markdown content
  const markdownContent = generateMarkdown(answers);
  const htmlContent = formatMarkdownToHtml(markdownContent);
  // const [llm, setLLM] = useState("gpt-4o");

  
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex justify-center items-center py-10 sm:py-3 md:py-4 px-2 sm:px-4 flex-grow">
        <div className="flex flex-col w-full max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Form Header */}
          <div className="px-3 py-3 sm:px-4 sm:py-4 bg-primary text-white flex items-center justify-between shadow-md">
            <div className="flex items-center">
              <ToyBrick className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-lg sm:text-xl font-semibold">Submit Your AI Project</h1>
    
              {/* <Select defaultValue="gpt-4o" onValueChange={(value) => setLLM(value)}>
                <SelectTrigger className="w-[120px] bg-white text-primary text-sm h-8 border-none shadow-sm">
                  <SelectValue placeholder="LLM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5</SelectItem>
                  <SelectItem value="claude-3">Claude 3</SelectItem>
                  <SelectItem value="llama-3">LLaMA 3</SelectItem> 
                </SelectContent>
              </Select> */}
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={clearProjectData}
              className="text-xs sm:text-sm"
            >
              Start New Project
            </Button>
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
              {messages.map((message, index) => (
                <ChatBubble 
                  key={message.id} 
                  message={message} 
                  index={index}
                  answers={answers}
                  onRequestDraft={!isComplete ? handleDraftRequest : undefined}
                  currentQuestion={currentQuestion}
                  isGeneratingDraft={message.content === generatingDraftForQuestion && generateDraftMutation.isPending}
                  onIgnore={handleIgnoreButton}
                  nextQuestion={handleNextQuestion}
                  onEdit={(text) => editInput(text)}
                  messages={messages}
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
            {/* {onboardingStage === 'welcome' && (
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
            )} */}
            
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
              currentQuestion >= 0 && currentQuestion < questions.length && questions[currentQuestion].type === "dropdown" ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const value = (e.target as any).elements[0].value;
                    handleSubmit(value);
                    setDraftResponse(value);
                  }}
                  className="border-t p-2 sm:p-3 bg-white flex flex-col gap-2"
                >

                  <select required={questions[currentQuestion].required} className="border rounded px-2 py-1">
                    <option value="">Select status</option>
                    {questions[currentQuestion].options?.map(option =>
                      typeof option === "string" ? (
                        <option key={option} value={option}>{option}</option>
                      ) : (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      )
                    )}
                  </select>
                  <button type="submit" className="mt-2 px-4 py-2 bg-primary text-white rounded">Next</button>
                </form>
              ) : (
              <ChatInput 
                placeholder={currentQuestion >= 0 && currentQuestion < questions.length ? questions[currentQuestion].placeholder : ""}
                onShowPreview={
                  currentQuestion >= questions.length
                    ? () => {
                        // When all questions are answered, move to visibility selection
                        setOnboardingStage('visibility');
                        addBotMessage("Please select your project visibility:");
                      }
                    : undefined
                }
                onSubmit={handleSubmit}
                isComplete={isComplete}
                onDownload={handleDownload}
                onSave={handleSaveToDatabase}
                onBackToChat={handleBackToChat}
                isPreviewMode={false}
                isSaved={isSaved}
                isSaving={submitProjectMutation.isPending}
                onEditInput={(fn) => {
                  editInputRef.current = fn;
                }}
              />
              )
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
                    className="px-6 py-3 bg-secondary hover:bg-secondary/90 text-blue-600 text-base font-medium rounded-lg flex items-center gap-2"
                  >
                    <Download className="h-5 w-5 text-blue-600" />
                    Download Markdown
                  </Button>
                </div>
              </div>
            )}
            
            {/* Profile update choice buttons */}
            {!isPreviewMode && onboardingStage === 'profile' && (
              <div className="border-t p-3 sm:p-4 bg-white shadow-inner">
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button
                    onClick={() => handleProfileChoice('yes')}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-base font-medium rounded-lg flex items-center gap-2"
                  >
                    <Link2 className="h-5 w-5" />
                    Yes, take me there!
                  </Button>
                  <Button
                    onClick={() => handleProfileChoice('later')}
                    variant="outline"
                    className="px-6 py-3 text-base font-medium rounded-lg flex items-center gap-2"
                  >
                    <Clock className="h-5 w-5" />
                    Maybe later
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