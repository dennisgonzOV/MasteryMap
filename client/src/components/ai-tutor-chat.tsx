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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!hasGreeted) {
      const greeting = {
        id: `msg_${Date.now()}`,
        role: 'tutor' as const,
        content: `Hello! I'm your AI tutor, and I'm here to help you understand and self-evaluate your competency in "${componentSkill.name}".

Let's start by exploring what this component skill means to you. Here are the rubric levels:

📈 **Emerging**: ${componentSkill.emerging || 'Beginning to understand and use this skill with significant support'}
🔍 **Developing**: ${componentSkill.developing || 'Building confidence and competency with this skill'} 
⭐ **Proficient**: ${componentSkill.proficient || 'Demonstrates solid understanding and effective use of this skill'}
🎯 **Applying**: ${componentSkill.applying || 'Uses this skill in complex situations and helps others develop it'}

To begin, can you tell me: What does "${componentSkill.name}" mean to you in your own words? Have you had any experiences where you've used this skill?`,
        timestamp: new Date()
      };
      setMessages([greeting]);
      setHasGreeted(true);
    }
  }, [componentSkill, hasGreeted]);

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

    const levelMessage: ChatMessage = {
      id: `msg_${Date.now()}_level`,
      role: 'student',
      content: `I believe I am at the "${level}" level for this component skill.`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, levelMessage]);

    // Send automatic tutor response based on level selection
    setTimeout(() => {
      let tutorResponse = '';
      switch (level) {
        case 'emerging':
          tutorResponse = `Great! You've identified yourself at the Emerging level. This means you're beginning to understand this skill. Can you tell me about a specific situation where you've tried to use "${componentSkill.name}"? What challenges did you face, and what would help you move toward the Developing level?`;
          break;
        case 'developing':
          tutorResponse = `Excellent! At the Developing level, you're building confidence with this skill. Can you share an example of when you successfully demonstrated "${componentSkill.name}"? What made that experience successful, and what areas do you feel you could strengthen to reach Proficient?`;
          break;
        case 'proficient':
          tutorResponse = `Wonderful! Proficient level shows you have a solid grasp of this skill. I'd love to hear about a specific example where you demonstrated "${componentSkill.name}" effectively. What made you successful? How might you apply this skill in new or more complex situations to reach the Applying level?`;
          break;
        case 'applying':
          tutorResponse = `Impressive! At the Applying level, you're using this skill in sophisticated ways. Please share a detailed example of how you've applied "${componentSkill.name}" in a complex or novel situation. How have you helped others develop this skill, or how have you innovated with it?`;
          break;
      }

      const autoTutorMessage: ChatMessage = {
        id: `msg_${Date.now()}_auto_tutor`,
        role: 'tutor',
        content: tutorResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, autoTutorMessage]);
    }, 1000);
  };

  const isReadyToComplete = selfEvaluation.selfAssessedLevel && selfEvaluation.justification && messages.length >= 4;

  return (
    <div className="space-y-4">
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

      {/* Level Selection */}
      {!selfEvaluation.selfAssessedLevel && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-900">
              Select Your Current Level
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {(['emerging', 'developing', 'proficient', 'applying'] as const).map((level) => (
                <Button
                  key={level}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLevelSelection(level)}
                  className="justify-start text-left h-auto p-2"
                >
                  <span className="capitalize font-medium">{level}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Self-Assessment Status */}
      {selfEvaluation.selfAssessedLevel && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Selected Level: {selfEvaluation.selfAssessedLevel}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEvaluationUpdate({ selfAssessedLevel: '' })}
          >
            Change Level
          </Button>
        </div>
      )}

      {/* Chat Interface */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <MessageCircle className="mr-2 h-4 w-4" />
            Chat with Your AI Tutor
          </CardTitle>
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

      {/* Justification Summary */}
      {selfEvaluation.selfAssessedLevel && (
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