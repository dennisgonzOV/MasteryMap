import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ComponentErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Brain, User, MessageCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'tutor' | 'student';
  content: string;
  timestamp: Date;
}

interface ComponentSkill {
  id: number;
  name: string;
  rubricLevels?: Record<string, string> | null;
}

interface SelfEvaluationData {
  selfAssessedLevel: 'emerging' | 'developing' | 'proficient' | 'applying' | '';
  justification: string;
  examples: string;
}

interface AITutorChatProps {
  assessmentId: number;
  componentSkill: ComponentSkill;
  selfEvaluation: SelfEvaluationData;
  onEvaluationUpdate: (updates: Partial<SelfEvaluationData>) => void;
  onComplete: () => void;
  isSubmitting: boolean;
}

const RUBRIC_LEVEL_SEQUENCE = [
  {
    value: 'emerging',
    label: 'Emerging',
    fallback: 'Beginning to understand and use this skill with significant support',
  },
  {
    value: 'developing',
    label: 'Developing',
    fallback: 'Building confidence and competency with this skill',
  },
  {
    value: 'proficient',
    label: 'Proficient',
    fallback: 'Demonstrates solid understanding and effective use of this skill',
  },
  {
    value: 'applying',
    label: 'Applying',
    fallback: 'Uses this skill in complex situations and helps others develop it',
  },
] as const;

export default function AITutorChat({
  assessmentId,
  componentSkill,
  selfEvaluation,
  onEvaluationUpdate,
  onComplete,
  isSubmitting
}: AITutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isTerminated, setIsTerminated] = useState(false);
  const [studentMessageCount, setStudentMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset component state when switching to a new component skill
  useEffect(() => {
    setMessages([]);
    setCurrentMessage('');
    setHasGreeted(false);
    setCurrentStep(1);
    setIsTerminated(false);
    setIsLoading(false);
    setStudentMessageCount(0);
  }, [componentSkill.id]);

  useEffect(() => {
    // Move to step 2 and initialize AI chat when level is selected
    if (selfEvaluation.selfAssessedLevel && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [selfEvaluation.selfAssessedLevel, currentStep]);

  useEffect(() => {
    if (currentStep === 2 && !hasGreeted && selfEvaluation.selfAssessedLevel) {
      const greeting = {
        id: `msg_${Date.now()}`,
        role: 'tutor' as const,
        content: `Hello! I'm your AI tutor, and I'm here to help you explore your understanding of "${componentSkill.name}".

I see you've selected the "${selfEvaluation.selfAssessedLevel}" level. That's a great starting point! Let me help you reflect on this choice and develop your self-evaluation.

${getLevelSpecificGreeting(selfEvaluation.selfAssessedLevel)}`,
        timestamp: new Date()
      };
      setMessages([greeting]);
      setHasGreeted(true);
    }
  }, [componentSkill, hasGreeted, currentStep, selfEvaluation.selfAssessedLevel]);

  const getLevelSpecificGreeting = (level: string) => {
    const rubricLevels = componentSkill.rubricLevels;
    const rubricDescription = rubricLevels?.[level];

    const fallbackDescriptions: Record<string, string> = {
      emerging: 'beginning to understand and use this skill with significant support',
      developing: 'building confidence and competency with this skill',
      proficient: 'demonstrating solid understanding and effective use of this skill',
      applying: 'using this skill in complex situations and helping others develop it',
    };

    const description = rubricDescription || fallbackDescriptions[level];
    const capitalizedLevel = level.charAt(0).toUpperCase() + level.slice(1);

    const prompts: Record<string, string> = {
      emerging: `Can you tell me about a specific situation where you've tried to use "${componentSkill.name}"? What challenges did you face, and what support would help you grow?`,
      developing: `Can you share an example of when you successfully demonstrated "${componentSkill.name}"? What made that experience successful?`,
      proficient: `I'd love to hear about a specific example where you demonstrated "${componentSkill.name}" in practice. What made you successful?`,
      applying: `Please share a detailed example of how you've applied "${componentSkill.name}" in a complex situation. How have you helped others with this skill?`,
    };

    const prompt = prompts[level] || `Can you tell me what "${componentSkill.name}" means to you?`;
    return `At the ${capitalizedLevel} level, the expectation is: "${description}". ${prompt}`;
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'student',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    // Increment student message count
    const newStudentMessageCount = studentMessageCount + 1;
    setStudentMessageCount(newStudentMessageCount);

    try {
      const response = await fetch('/api/ai/tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId,
          componentSkill,
          conversationHistory: [...messages, userMessage],
          currentEvaluation: selfEvaluation
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get tutor response');
      }

      const data = await response.json();

      const tutorMessage: ChatMessage = {
        id: `msg_${Date.now()}_tutor`,
        role: 'tutor',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, tutorMessage]);

      // Check if we've reached the 3-message limit
      if (newStudentMessageCount >= 3) {
        const limitMessage: ChatMessage = {
          id: `msg_${Date.now()}_limit`,
          role: 'tutor',
          content: "Thank you for our conversation! You've shared great insights about your understanding. Based on our discussion, you're now ready to complete your self-evaluation. Please click 'Complete Evaluation' to submit your final assessment.",
          timestamp: new Date()
        };

        setTimeout(() => {
          setMessages(prev => [...prev, limitMessage]);
          setIsTerminated(true);
        }, 1000);

        setIsLoading(false);
        return;
      }

      // Handle safety flags and conversation termination
      if (data.shouldTerminate && data.safetyFlag) {
        // Add appropriate system message based on safety flag
        let systemMessage = "This conversation has ended. Please complete your self-evaluation or speak with your teacher if you need assistance.";

        if (data.safetyFlag.includes('inappropriate_language')) {
          systemMessage = "This conversation has ended due to inappropriate language. Please complete your self-evaluation or speak with your teacher.";
        } else if (data.safetyFlag.includes('homicidal') || data.safetyFlag.includes('suicidal')) {
          systemMessage = "This conversation has ended for safety reasons. Please speak with a trusted adult or counselor if you need support.";
        }

        const terminationMessage: ChatMessage = {
          id: `msg_${Date.now()}_system`,
          role: 'tutor',
          content: systemMessage,
          timestamp: new Date()
        };

        // Set termination state and add system message
        setIsTerminated(true);
        setCurrentMessage('');
        setIsLoading(false);

        setTimeout(() => {
          setMessages(prev => [...prev, terminationMessage]);
        }, 2000);

        return;
      }

      // Update self-evaluation if the AI suggests changes
      if (data.suggestedEvaluation) {
        onEvaluationUpdate(data.suggestedEvaluation);
      }
    } catch (error) {
      console.error('Error getting tutor response:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'tutor',
        content: 'I apologize, but I encountered an error. Please try again or continue with your self-evaluation.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isLoading || isTerminated || studentMessageCount >= 3) {
      return;
    }

    // Ensure paste works reliably in this controlled textarea.
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const target = e.currentTarget;
    const selectionStart = target.selectionStart ?? currentMessage.length;
    const selectionEnd = target.selectionEnd ?? currentMessage.length;

    const nextMessage = `${currentMessage.slice(0, selectionStart)}${pastedText}${currentMessage.slice(selectionEnd)}`;
    setCurrentMessage(nextMessage);
  };

  const handleLevelSelection = (level: 'emerging' | 'developing' | 'proficient' | 'applying') => {
    onEvaluationUpdate({ selfAssessedLevel: level });
    // Step 2 will be automatically triggered by the useEffect above
  };

  const isReadyToComplete = selfEvaluation.selfAssessedLevel && studentMessageCount >= 3;

  return (
    <ComponentErrorBoundary componentName="AI Tutor Chat" showError={false}>
      <div className="space-y-4">
        {/* Step Progress Indicator */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                  1
                </div>
                <div className="text-sm font-medium">Select Your Level</div>
                <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                  2
                </div>
                <div className="text-sm font-medium">Chat with AI Tutor</div>
              </div>
              {selfEvaluation.selfAssessedLevel && (
                <Badge variant="secondary" className="ml-4">
                  Step {currentStep} of 2
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Combined Component Skill Display and Level Selection */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-900 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              {currentStep === 1 ? 'Step 1: Select Your Current Level - ' : 'Component Skill: '}
              {componentSkill.name}
            </CardTitle>
            {currentStep === 1 && (
              <p className="text-xs text-blue-700 mt-1">
                Click on the level that best describes your current competency with this skill.
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {RUBRIC_LEVEL_SEQUENCE.map((levelOption, index) => (
                <div
                  key={levelOption.value}
                  onClick={currentStep === 1 ? () => handleLevelSelection(levelOption.value) : undefined}
                  className={`p-3 rounded border transition-all duration-200 ${selfEvaluation.selfAssessedLevel === levelOption.value
                    ? 'bg-blue-200 border-blue-500 shadow-md'
                    : currentStep === 1
                      ? 'bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                      : 'bg-white border-blue-200'
                    } ${currentStep === 1 ? 'transform hover:scale-[1.02]' : ''}`}
                >
                  <div className="font-medium mb-1 text-sm">
                    {index + 1}. {levelOption.label}
                  </div>
                  <div className="text-blue-700 leading-relaxed">
                    {componentSkill.rubricLevels?.[levelOption.value] || levelOption.fallback}
                  </div>
                  {selfEvaluation.selfAssessedLevel === levelOption.value && (
                    <div className="mt-2 flex items-center text-blue-600">
                      <span className="text-xs font-medium">✓ Selected</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {currentStep === 1 && (
              <p className="text-xs text-blue-600 mt-3 text-center font-medium">
                💡 Click on any level above to make your selection
              </p>
            )}
          </CardContent>
        </Card>

        {/* Current Self-Assessment Status */}
        {selfEvaluation.selfAssessedLevel && currentStep === 2 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Selected Level: {selfEvaluation.selfAssessedLevel}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onEvaluationUpdate({
                  selfAssessedLevel: '',
                  justification: '',
                  examples: ''
                });
                setCurrentStep(1);
                setMessages([]);
                setHasGreeted(false);
                setCurrentMessage('');
                setIsTerminated(false);
              }}
            >
              Change Level
            </Button>
          </div>
        )}

        {/* Step 2: Chat Interface */}
        {currentStep === 2 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <MessageCircle className="mr-2 h-4 w-4" />
                Step 2: Chat with Your AI Tutor
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1">
                Explore your understanding and develop your self-evaluation through conversation.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[80%] ${message.role === 'student' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                        <Avatar className="w-8 h-8">
                          {message.role === 'tutor' ? (
                            <Brain className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </Avatar>
                        <div
                          className={`rounded-lg p-3 ${message.role === 'student'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                          <div className={`text-xs mt-1 ${message.role === 'student' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2">
                        <Avatar className="w-8 h-8">
                          <Brain className="h-4 w-4" />
                        </Avatar>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onPaste={handlePaste}
                    placeholder={isTerminated ? "Conversation has ended" : studentMessageCount >= 3 ? "You've completed the required conversation. Click 'Complete Evaluation' to submit." : "Ask questions, share experiences, or discuss your understanding..."}
                    className="min-h-[60px] resize-none"
                    disabled={isLoading || isTerminated || studentMessageCount >= 3}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || isLoading || isTerminated || studentMessageCount >= 3}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}



        {/* Complete Button */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {studentMessageCount >= 3
              ? "Conversation complete - ready to submit your evaluation!"
              : `Continue chatting to develop your self-evaluation. (${studentMessageCount}/3 messages)`}
          </div>
          <Button
            onClick={onComplete}
            disabled={!isReadyToComplete || isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing AI Analysis...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Complete Evaluation
              </>
            )}
          </Button>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
}
