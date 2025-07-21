import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { ToyBrick, Database, Download, Link2, Clock, Eye } from "lucide-react";
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

export default function ChatForm() {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(-1);
  const [currentCriteria, setCurrentCriteria] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<'edit' | 'preview'>('edit');
  const [isSaved, setIsSaved] = useState(false);
  const [generatingDraftForQuestion, setGeneratingDraftForQuestion] = useState<string | null>(null);
  const [onboardingStage, setOnboardingStage] = useState<'welcome' | 'purpose' | 'questions' | 'visibility' | 'success' | 'profile'>('welcome');
  const [selectedVisibility, setSelectedVisibility] = useState<string>("private");
  const [profileChoice, setProfileChoice] = useState<'yes' | 'later' | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [draftResponse, setDraftResponse] = useState<string | null>(null);
  const lastUserInputRef = useRef<string | null>(null);
  const [showButton, setShowButton] = useState(false);

  // Clear all project data from localStorage and reset state
  const clearProjectData = () => {
    if (window.confirm("Are you sure you want to start a new project? This will clear all your current project data.")) {
      localStorage.removeItem('projectAnswers');
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
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (error && typeof error === 'object') {
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
    
    try {
      const savedAnswers = localStorage.getItem('projectAnswers');
      if (savedAnswers) {
        const parsedAnswers = JSON.parse(savedAnswers);
        setAnswers(parsedAnswers);
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
        addBotMessage("The purpose of this is to share your project experience with prospective customers to showcase your capabilities and expertise. In this way, we can better connect you with new opportunities. Keep in mind that the information provided by you will be used for marketing purposes and will be publicly visible on the Digital Village platform.");
      }, 500);
    } else if (onboardingStage === 'purpose') {
      setOnboardingStage('questions');
      setCurrentQuestion(0);
      setTimeout(() => {
        addBotMessage(questions[0].text);
      }, 500);
    }
  };

  useEffect(() => {
    if (onboardingStage === 'welcome') {
      const timeout1 = setTimeout(() => {
        setOnboardingStage('purpose');
        addBotMessage(
          "The purpose of this is to share your project experience with prospective customers to showcase your capabilities and expertise. In this way, we can better connect you with new opportunities."
        );
      }, 2000);

      const timeout2 = setTimeout(() => {
        addBotMessage(
          "Keep in mind that the information provided by you will be used for marketing purposes and will be publicly visible on the Digital Village platform."
        );
        setShowButton(true);
      }, 4000);

      return () => {
        clearTimeout(timeout1);
      };
    } else {
      setShowButton(false);
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

  const nextQuestion = (userInput: string, question: (typeof questions)[number]): string => {
    return `Great! Let's move on.`;
  };

  const generateAdvice = async (
    userInput: string,
    questionObj: (typeof questions)[number],
    context: Record<string, string>
  ): Promise<string> => {
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
      console.log("AI feedback:", data.feedback);
      return data.feedback || "Thanks for your response!";
    } catch (error) {
      console.error("Error generating advice:", error);
      return "Sorry, I couldn't generate advice at this time.";
    }
  };

  const [showNextButton, setShowNextButton] = useState(false);

  const handleNextQuestion = () => {
    setCurrentQuestion(prev => prev + 1);
    if (currentQuestion + 1 < questions.length) {
      setTimeout(() => {
        addBotMessage(questions[currentQuestion + 1].text);
      }, 500);
    } else {
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
    setCurrentQuestion(prev => prev + 1);
    if (currentQuestion + 1 < questions.length) {
      setTimeout(() => {
        addBotMessage(questions[currentQuestion + 1].text);
      }, 500);
    } else {
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
      const { feedback, satisfied } = await evaluateAnswerMutation.mutateAsync({
        question: questions[currentQuestion].text,
        answer: value,
        evalCriteria: criteriaText,
        context: answers
      });
      const isLastQuestion = currentQuestion === questions.length - 1;
      if (satisfied || isLastQuestion) {
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
        const advice = await generateAdvice(value, questions[currentQuestion], answers);
        addAdviceMessage(advice);
      }
    }
  };

  const editInputRef = useRef<((text: string) => void) | null>(null);

  const editInput = (text: string) => {
    if (editInputRef.current) {
      editInputRef.current(text);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setCurrentCriteria(prev => prev - 1);
      addBotMessage("Let's go back to the previous question. " + questions[currentQuestion - 1].text);
    }
  };

  const handleSkip = () => {
    if (currentQuestion >= 0 && currentQuestion < questions.length && !questions[currentQuestion].required) {
      addUserMessage("Skip");
      const updatedAnswers = { ...answers };
      updatedAnswers[questions[currentQuestion].id] = '';
      setAnswers(updatedAnswers);
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

  const handleShowPreview = () => {
    setIsPreviewMode(true);
  };

  const handleBackToChat = () => {
    setIsPreviewMode(false);
  };

  const handleDownload = () => {
    const markdown = generateMarkdown(answers);
    const filename = `${answers.title || 'ai-project'}.md`;
    downloadMarkdown(markdown, filename);
  };

  const handleUpdateAnswer = (id: string, value: string) => {
    const updatedAnswers = { ...answers };
    updatedAnswers[id] = value;
    setAnswers(updatedAnswers);
    try {
      localStorage.setItem('projectAnswers', JSON.stringify(updatedAnswers));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    toast({
      title: "Answer Updated",
      description: "Your answer has been updated successfully.",
      variant: "default",
    });
  };

  const handleViewModeChange = (mode: 'edit' | 'preview') => {
    setPreviewViewMode(mode);
  };

  const handleSaveToDatabase = () => {
    const answersWithVisibility = {
      ...answers,
      visibility: selectedVisibility
    };
    try {
      localStorage.setItem('projectAnswers', JSON.stringify(answersWithVisibility));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    submitProjectMutation.mutate(answersWithVisibility, {
      onSuccess: () => {
        setOnboardingStage('success');
        setTimeout(() => {
          addBotMessage("Thank you for your submission!");
          setTimeout(() => {
            addBotMessage("Your Digital Village profile helps attract clients. Want to update it now for more opportunities? ");
            setOnboardingStage('profile');
          }, 1000);
        }, 500);
      }
    });
    setAnswers(answersWithVisibility);
  };

  const handleProfileChoice = (choice: 'yes' | 'later') => {
    setProfileChoice(choice);
    if (choice === 'yes') {
      addUserMessage("Update my profile.");
      setTimeout(() => {
        addBotMessage("Great choice! I'm opening the Digital Village Network App for you now. You'll be able to update your profile there.");
        window.open('https://digitalvillage.app/', '_blank');
      }, 500);
    } else {
      addUserMessage("Maybe later.");
      setTimeout(() => {
        addBotMessage("No problem! Remember you can update your Digital Village profile anytime to enhance your visibility to clients. Thanks for sharing your project with us!");
      }, 500);
    }
  };

  const handleDraftRequest = (question: string) => {
    setGeneratingDraftForQuestion(question);
    const questionId = questions[currentQuestion]?.id;
    const criteriaObj = evalCriteria.find(c => c.question === questionId);
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

  const markdownContent = generateMarkdown(answers);
  const htmlContent = formatMarkdownToHtml(markdownContent);
  const isInputDisabled = generateDraftMutation.isPending 
    || submitProjectMutation.isPending 
    || evaluateAnswerMutation.isPending;

  console.log({"testing isinputdisabled": isInputDisabled });

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex justify-center items-center py-10 sm:py-3 md:py-4 px-2 sm:px-4 flex-grow">
        <div className="flex flex-col w-full max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Form Header */}
          <div className="px-3 py-3 sm:px-4 sm:py-4 bg-primary text-white flex items-center justify-between shadow-md">
            <div className="flex items-center">
              <ToyBrick className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-lg sm:text-xl font-semibold">Tell Us About Your AI Project</h1>
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
              isInputDisabled={isInputDisabled} // Pass isInputDisabled to ChatNavigation
            />
          )}
          
          {/* Visibility Selector - Only show in visibility stage */}
          {!isPreviewMode && onboardingStage === 'visibility' && (
            <div className="border-t p-3 sm:p-4 bg-white shadow-inner">
              <div className="flex justify-center gap-5">
                <Button 
                  onClick={handleShowPreview}
                  className="px-6 py-3 bg-secondary hover:bg-gray-200 text-blue-600 text-base font-medium rounded-lg"
                >
                  <Eye className="h-5 w-5 text-blue-600" />
                  Preview
                </Button>
                <Button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-secondary hover:bg-gray-200 text-blue-600 text-base font-medium rounded-lg flex items-center gap-2"
                >
                  <Download className="h-5 w-5 text-blue-600" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Input Area */}
          {onboardingStage === 'purpose' && showButton && (
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
                        setOnboardingStage('visibility');
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
                disabled={isInputDisabled}
                isSaving={submitProjectMutation.isPending}
                onEditInput={(fn) => {
                  editInputRef.current = fn;
                }}
              />
            )
          )}

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

          {!isPreviewMode && onboardingStage === 'visibility' && (
            <div className="flex flex-col sm:flex-row justify-center gap-3 pb-5">
              <Button
                onClick={handleSaveToDatabase}
                disabled={isSaved || submitProjectMutation.isPending}
                className="px-6 py-3 bg-primary hover:bg-primary/80 text-base font-medium rounded-lg flex items-center gap-2"
              >
                <Database className="h-5 w-5" />
                {submitProjectMutation.isPending ? 'Saving...' : isSaved ? 'Saved' : 'Submit Project'}
              </Button>
            </div>
          )}

          {!isPreviewMode && onboardingStage === 'profile' && (
            <div className="border-t p-3 sm:p-4 bg-white shadow-inner">
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  onClick={() => handleProfileChoice('yes')}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-base font-medium rounded-lg flex items-center gap-2"
                >
                  <Link2 className="h-5 w-5" />
                  Update Profile
                </Button>
                <Button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-secondary hover:bg-gray-200 text-blue-600 text-base font-medium rounded-lg flex items-center gap-2"
                >
                  <Download className="h-5 w-5 text-blue-600" />
                  Download Markdown
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}