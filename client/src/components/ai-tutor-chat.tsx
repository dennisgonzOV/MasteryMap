import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  emerging: string;
  developing: string;
  proficient: string;
  applying: string;
}

interface SelfEvaluationData {
  selfAssessedLevel: 'emerging' | 'developing' | 'proficient' | 'applying' | '';
  justification: string;
  examples: string;
}

interface AITutorChatProps {
  componentSkill: ComponentSkill;
  selfEvaluation: SelfEvaluationData;
  onEvaluationUpdate: (updates: Partial<SelfEvaluationData>) => void;
  onComplete: () => void;
  isSubmitting: boolean;
}

export default function AITutorChat({
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    switch (level) {
      case 'emerging':
        return `At the Emerging level, you're beginning to understand this skill. Can you tell me about a specific situation where you've tried to use "${componentSkill.name}"? What challenges did you face, and what support would help you grow?`;
      case 'developing':
        return `At the Developing level, you're building confidence with this skill. Can you share an example of when you successfully demonstrated "${componentSkill.name}"? What made that experience successful?`;
      case 'proficient':
        return `At the Proficient level, you have a solid grasp of this skill. I'd love to hear about a specific example where you demonstrated "${componentSkill.name}" effectively. What made you successful?`;
      case 'applying':
        return `At the Applying level, you're using this skill in sophisticated ways. Please share a detailed example of how you've applied "${componentSkill.name}" in a complex situation. How have you helped others with this skill?`;
      default:
        return `Let's explore your understanding of this skill together. Can you tell me what "${componentSkill.name}" means to you?`;
    }
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

    try {
      const response = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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

  const handleLevelSelection = (level: 'emerging' | 'developing' | 'proficient' | 'applying') => {
    onEvaluationUpdate({ selfAssessedLevel: level });
    // Step 2 will be automatically triggered by the useEffect above
  };

  const isReadyToComplete = selfEvaluation.selfAssessedLevel && selfEvaluation.justification && messages.length >= 4;

  return (
    <div className="space-y-4">
      {/* Step Progress Indicator */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <div className="text-sm font-medium">Select Your Level</div>
              <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
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

      {/* Rubric Reference */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-blue-900 flex items-center">
            <Brain className="mr-2 h-4 w-4" />
            Component Skill: {componentSkill.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(['emerging', 'developing', 'proficient', 'applying'] as const).map((level) => (
              <div 
                key={level} 
                className={`p-2 rounded border ${
                  selfEvaluation.selfAssessedLevel === level 
                    ? 'bg-blue-100 border-blue-400' 
                    : 'bg-white border-blue-200'
                }`}
              >
                <div className="font-medium capitalize mb-1">{level}</div>
                <div className="text-blue-700">
                  {componentSkill[level] || {
                    emerging: 'Beginning to understand and use this skill with significant support',
                    developing: 'Building confidence and competency with this skill',
                    proficient: 'Demonstrates solid understanding and effective use of this skill',
                    applying: 'Uses this skill in complex situations and helps others develop it'
                  }[level]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Level Selection */}
      {currentStep === 1 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-900 flex items-center">
              <span className="mr-2">📋</span>
              Step 1: Select Your Current Level
            </CardTitle>
            <p className="text-xs text-green-700 mt-1">
              Choose the level that best describes your current competency with this skill.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {(['emerging', 'developing', 'proficient', 'applying'] as const).map((level) => (
                <Button
                  key={level}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLevelSelection(level)}
                  className="justify-start text-left h-auto p-3 hover:bg-green-100"
                >
                  <div>
                    <div className="capitalize font-medium text-base">{level}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {componentSkill[level] || {
                        emerging: 'Beginning to understand with support',
                        developing: 'Building confidence and competency',
                        proficient: 'Solid understanding and effective use',
                        applying: 'Complex use and helping others'
                      }[level]}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              onEvaluationUpdate({ selfAssessedLevel: '' });
              setCurrentStep(1);
              setMessages([]);
              setHasGreeted(false);
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
                        className={`rounded-lg p-3 ${
                          message.role === 'student'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                        <div className={`text-xs mt-1 ${
                          message.role === 'student' ? 'text-blue-100' : 'text-gray-500'
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
                  placeholder="Ask questions, share experiences, or discuss your understanding..."
                  className="min-h-[60px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isLoading}
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

      {/* Justification Summary */}
      {selfEvaluation.selfAssessedLevel && currentStep === 2 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-900">
              Your Self-Evaluation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-yellow-800">
                  Selected Level: {selfEvaluation.selfAssessedLevel}
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-yellow-800 mb-1 block">
                  Your Justification (based on our conversation):
                </label>
                <Textarea
                  value={selfEvaluation.justification}
                  onChange={(e) => onEvaluationUpdate({ justification: e.target.value })}
                  placeholder="Summarize your reasoning for selecting this level..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-yellow-800 mb-1 block">
                  Examples (optional):
                </label>
                <Textarea
                  value={selfEvaluation.examples}
                  onChange={(e) => onEvaluationUpdate({ examples: e.target.value })}
                  placeholder="Provide specific examples from our discussion..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {isReadyToComplete 
            ? "Ready to submit your self-evaluation!" 
            : "Continue chatting to develop your self-evaluation."}
        </div>
        <Button
          onClick={onComplete}
          disabled={!isReadyToComplete || isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Submitting...</span>
            </div>
          ) : (
            'Complete Evaluation'
          )}
        </Button>
      </div>
    </div>
  );
}