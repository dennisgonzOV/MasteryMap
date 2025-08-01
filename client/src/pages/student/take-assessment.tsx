import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  FileText, 
  User, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Send
} from 'lucide-react';
import { format } from "date-fns";
import { getCompetencyInfo } from "@/lib/competencyUtils";
import AIFeedbackModal from '@/components/modals/ai-feedback-modal';
import AITutorChat from '@/components/ai-tutor-chat';

interface Question {
  id: string;
  text: string;
  type: 'open-ended' | 'multiple-choice' | 'short-answer';
  options?: string[];
  rubricCriteria?: string;
}

interface Assessment {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  questions: Question[];
  componentSkillIds: number[];
  aiGenerated: boolean;
  assessmentType: 'teacher' | 'self-evaluation';
  allowSelfEvaluation: boolean;
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
  componentSkillId: number;
  selfAssessedLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
  justification: string;
  examples: string;
}

export default function TakeAssessment() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Self-evaluation specific state
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);
  const [selfEvaluations, setSelfEvaluations] = useState<Record<number, SelfEvaluationData>>({});
  const [aiFeedbackModal, setAiFeedbackModal] = useState<{
    open: boolean;
    feedback: string;
    hasRiskyContent: boolean;
    skillName: string;
    selectedLevel: string;
  }>({
    open: false,
    feedback: '',
    hasRiskyContent: false,
    skillName: '',
    selectedLevel: ''
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to access this assessment.",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch assessment data
  const { data: assessment, isLoading: assessmentLoading } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${id}`],
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  // Fetch component skills with competency details
  const { data: componentSkillsDetails = [] } = useQuery({
    queryKey: ["/api/component-skills/details"],
    enabled: isAuthenticated,
    retry: false,
  });

  const submitAssessmentMutation = useMutation({
    mutationFn: async (submissionData: any) => {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment submitted successfully!",
        description: "Your responses have been saved and will be reviewed by your teacher.",
      });
      setLocation('/student/dashboard');
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: "There was an error submitting your assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Self-evaluation submission mutation
  const submitSelfEvaluationMutation = useMutation({
    mutationFn: async (selfEvalData: SelfEvaluationData) => {
      const response = await fetch('/api/self-evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...selfEvalData,
          assessmentId: parseInt(id!),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit self-evaluation');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const currentSkill = assessmentComponentSkills[currentSkillIndex];
      const currentEval = selfEvaluations[currentSkill?.id];
      
      // Show AI feedback modal if available
      if (data.aiAnalysis?.improvementFeedback) {
        setAiFeedbackModal({
          open: true,
          feedback: data.aiAnalysis.improvementFeedback,
          hasRiskyContent: data.aiAnalysis.hasRiskyContent || false,
          skillName: currentSkill?.name || 'Component Skill',
          selectedLevel: currentEval?.selfAssessedLevel || ''
        });
      } else {
        // Fallback toast if no AI feedback
        toast({
          title: "Self-evaluation submitted!",
          description: "Your response has been saved.",
        });
        
        // Move to next skill or finish
        if (currentSkillIndex < assessmentComponentSkills.length - 1) {
          setCurrentSkillIndex(prev => prev + 1);
        } else {
          setTimeout(() => {
            setLocation('/student/dashboard');
          }, 1000);
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: "There was an error submitting your self-evaluation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get component skills specific to this assessment
  const assessmentComponentSkills = componentSkillsDetails.filter((skill: ComponentSkill) => 
    assessment?.componentSkillIds.includes(skill.id)
  );

  // Debug logging to see what data we have
  useEffect(() => {
    if (assessmentComponentSkills.length > 0) {
      console.log('Assessment component skills:', assessmentComponentSkills);
      console.log('First skill structure:', assessmentComponentSkills[0]);
    }
  }, [assessmentComponentSkills]);

  // Self-evaluation helper functions
  const updateSelfEvaluation = (skillId: number, updates: Partial<SelfEvaluationData>) => {
    setSelfEvaluations(prev => ({
      ...prev,
      [skillId]: {
        ...prev[skillId],
        componentSkillId: skillId,
        ...updates,
      } as SelfEvaluationData
    }));
  };

  const submitCurrentSelfEvaluation = async () => {
    const currentSkill = assessmentComponentSkills[currentSkillIndex];
    const currentEval = selfEvaluations[currentSkill.id];
    
    if (!currentEval || !currentEval.selfAssessedLevel || !currentEval.justification) {
      toast({
        title: "Incomplete self-evaluation",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitSelfEvaluationMutation.mutateAsync(currentEval);
      // Success handling is done in the mutation's onSuccess callback
    } catch (error) {
      console.error('Error submitting self-evaluation:', error);
    }
  };

  const handleAIFeedbackContinue = () => {
    setAiFeedbackModal(prev => ({ ...prev, open: false }));
    
    // Move to next skill or finish
    if (currentSkillIndex < assessmentComponentSkills.length - 1) {
      setCurrentSkillIndex(prev => prev + 1);
    } else {
      // All skills completed, redirect to dashboard
      toast({
        title: "Self-evaluation complete!",
        description: "All component skills have been evaluated. Great work!",
      });
      setTimeout(() => {
        setLocation('/student/dashboard');
      }, 2000);
    }
  };

  // Calculate progress based on assessment type
  const progress = assessment?.assessmentType === 'self-evaluation' 
    ? (currentSkillIndex / Math.max(assessmentComponentSkills.length, 1)) * 100
    : ((currentQuestionIndex + 1) / Math.max(assessment?.questions.length || 1, 1)) * 100;

  if (isLoading || assessmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading assessment...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Not Found</h2>
            <p className="text-gray-600 mb-4">
              The assessment you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => setLocation('/student/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = assessment.questions?.[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (assessment.questions?.length || 1) - 1;
  const allQuestionsAnswered = assessment.questions?.every(q => answers[q.id]) || false;

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (assessment.assessmentType === 'self-evaluation') {
      if (currentSkillIndex < assessmentComponentSkills.length - 1) {
        setCurrentSkillIndex(prev => prev + 1);
      }
    } else {
      if (currentQuestionIndex < (assessment.questions?.length || 0) - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (assessment.assessmentType === 'self-evaluation') {
      if (currentSkillIndex > 0) {
        setCurrentSkillIndex(prev => prev - 1);
      }
    } else {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
      }
    }
  };

  const handleSubmit = async () => {
    // Handle self-evaluation submission
    if (assessment.assessmentType === 'self-evaluation') {
      await submitCurrentSelfEvaluation();
      return;
    }

    // Handle teacher assessment submission
    if (!assessment.questions || assessment.questions.length === 0) {
      toast({
        title: "No questions available",
        description: "This assessment has no questions to answer.",
        variant: "destructive",
      });
      return;
    }

    // Check for questions with configuration errors
    const questionsWithErrors = assessment.questions.filter(question => {
      if (question.type === 'multiple-choice') {
        let options = question.options;
        if (typeof options === 'string') {
          try {
            const parsed = JSON.parse(options);
            options = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return true; // Has error
          }
        }
        return !Array.isArray(options) || options.length === 0;
      }
      return false;
    });

    if (questionsWithErrors.length > 0) {
      toast({
        title: "Cannot submit assessment",
        description: `Some questions have configuration errors. Please contact your teacher. (Questions: ${questionsWithErrors.map(q => assessment.questions.indexOf(q) + 1).join(', ')})`,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Only check answerable questions
    const answerableQuestions = assessment.questions.filter(question => {
      if (question.type === 'multiple-choice') {
        let options = question.options;
        if (typeof options === 'string') {
          try {
            const parsed = JSON.parse(options);
            options = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return false; // Not answerable due to error
          }
        }
        return Array.isArray(options) && options.length > 0;
      }
      return true; // Other question types are answerable
    });

    const allAnswerableQuestionsAnswered = answerableQuestions.every(q => answers[q.id]);

    if (!allAnswerableQuestionsAnswered) {
      toast({
        title: "Please answer all questions",
        description: "Make sure you've answered all answerable questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const submissionData = {
      assessmentId: assessment.id,
      responses: Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }))
    };

    submitAssessmentMutation.mutate(submissionData);
  };

  const isDueDatePassed = new Date() > new Date(assessment.dueDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/student/dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>

        {/* Due Date Alert */}
        {assessment && (
          <div className={`mb-6 p-4 rounded-lg border ${
            isDueDatePassed 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : new Date(assessment.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
                ? 'bg-orange-50 border-orange-200 text-orange-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span className="font-medium">
                  {isDueDatePassed ? 'Past Due:' : 'Due:'} {format(new Date(assessment.dueDate), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                </span>
              </div>
              {isDueDatePassed && (
                <Badge variant="destructive">Late Submission</Badge>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {assessment.title}
                </CardTitle>
                <p className="text-gray-600 mt-1">{assessment.description}</p>

                {/* Competencies Being Tested */}
                {getCompetencyInfo(assessment, componentSkillsDetails) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <span className="mr-2">🎯</span>
                      What skills you'll demonstrate:
                    </h4>
                    <div className="space-y-2">
                      {getCompetencyInfo(assessment, componentSkillsDetails).map((competency: any, index: number) => (
                        <div key={index} className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-blue-900">
                                {competency.competencyName}
                              </h5>
                              <p className="text-sm text-blue-700">
                                {competency.learnerOutcomeName}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-blue-600 mb-1">Specific skills:</p>
                            <div className="flex flex-wrap gap-1">
                              {competency.skills.map((skill: any) => (
                                <Badge key={skill.id} variant="secondary" className="text-xs">
                                  {skill.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    Due: {format(new Date(assessment.dueDate), 'MMM d, yyyy h:mm a')}
                  </div>
                  {isDueDatePassed && (
                    <Badge variant="destructive" className="mt-1">Late Submission</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {assessment.assessmentType === 'self-evaluation' ? (
                  `Component Skill ${currentSkillIndex + 1} of ${assessmentComponentSkills.length}`
                ) : (
                  `Question ${currentQuestionIndex + 1} of ${assessment.questions?.length || 0}`
                )}
              </span>
              <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>

        {/* Main Content - Question or Self-Evaluation */}
        {assessment.assessmentType === 'self-evaluation' ? (
          // AI Tutor Chat Interface for Self-Evaluation
          assessmentComponentSkills.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Self-Evaluate with AI Tutor: {assessmentComponentSkills[currentSkillIndex]?.name}</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Chat with your AI tutor to explore your understanding and competency level for this skill.
                </p>
              </CardHeader>
              <CardContent>
                <AITutorChat
                  componentSkill={assessmentComponentSkills[currentSkillIndex]}
                  selfEvaluation={selfEvaluations[assessmentComponentSkills[currentSkillIndex]?.id] || {
                    selfAssessedLevel: '',
                    justification: '',
                    examples: ''
                  }}
                  onEvaluationUpdate={(updates) => 
                    updateSelfEvaluation(assessmentComponentSkills[currentSkillIndex].id, updates)
                  }
                  onComplete={submitCurrentSelfEvaluation}
                  isSubmitting={submitSelfEvaluationMutation.isPending}
                />
              </CardContent>
            </Card>
          )
        ) : (
          // Traditional Question Interface
          currentQuestion && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Question {currentQuestionIndex + 1}</span>
                </CardTitle>
              </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-800 leading-relaxed">{currentQuestion.text}</p>

            {currentQuestion.type === 'multiple-choice' && (
              <div className="space-y-3">
                {(() => {
                  // Parse options if they're stored as JSON string
                  let options = currentQuestion.options;
                  let hasParsingError = false;

                  if (typeof options === 'string') {
                    try {
                      const parsed = JSON.parse(options);
                      if (Array.isArray(parsed)) {
                        options = parsed;
                      } else {
                        hasParsingError = true;
                        options = [];
                      }
                    } catch (e) {
                      console.error('Failed to parse options for question:', currentQuestion.id, 'Options:', options, 'Error:', e);
                      hasParsingError = true;
                      options = [];
                    }
                  }

                  // Ensure options is an array and has valid string elements
                  if (!Array.isArray(options)) {
                    hasParsingError = true;
                    options = [];
                  } else {
                    // Filter out any non-string or empty options
                    options = options.filter((option: any) => 
                      typeof option === 'string' && option.trim().length > 0
                    );
                  }

                  if (hasParsingError || options.length === 0) {
                    return (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                          <p className="text-red-800 font-medium">Question Configuration Error</p>
                        </div>
                        <p className="text-red-700 text-sm">
                          This multiple-choice question has malformed or missing answer options. 
                          Please contact your teacher to resolve this issue.
                        </p>
                        <p className="text-red-600 text-xs mt-2">
                          Question ID: {currentQuestion.id}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <RadioGroup
                      value={answers[currentQuestion.id] || ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      className="space-y-3"
                    >
                      {options.map((option: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value={option} id={`option-${currentQuestion.id}-${index}`} />
                          <Label htmlFor={`option-${currentQuestion.id}-${index}`} className="cursor-pointer flex-1 text-gray-800">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  );
                })()}
              </div>
            )}

            {(currentQuestion.type === 'open-ended' || currentQuestion.type === 'short-answer') && (
              <Textarea
                placeholder="Type your answer here..."
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                rows={currentQuestion.type === 'open-ended' ? 6 : 3}
                className="w-full"
              />
            )}

            {currentQuestion.rubricCriteria && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Grading Criteria:</h4>
                <p className="text-blue-800 text-sm">{currentQuestion.rubricCriteria}</p>
              </div>
            )}
          </CardContent>
            </Card>
          )
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={assessment.assessmentType === 'self-evaluation' ? currentSkillIndex === 0 : currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {user?.firstName} {user?.lastName}
            </span>
          </div>

          {assessment.assessmentType === 'self-evaluation' ? (
            <div className="text-sm text-gray-600">
              {currentSkillIndex === assessmentComponentSkills.length - 1 
                ? "Complete your chat to submit your final evaluation"
                : "Complete your chat to continue to the next skill"}
            </div>
          ) : isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered || isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Assessment
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Overview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {assessment.assessmentType === 'self-evaluation' ? 'Component Skills Overview' : 'Question Overview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessment.assessmentType === 'self-evaluation' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assessmentComponentSkills.map((skill, index) => {
                  const isCompleted = selfEvaluations[skill.id]?.selfAssessedLevel && selfEvaluations[skill.id]?.justification;
                  const isCurrent = index === currentSkillIndex;
                  
                  return (
                    <button
                      key={skill.id}
                      onClick={() => setCurrentSkillIndex(index)}
                      className={`
                        p-3 rounded text-left text-sm transition-colors border
                        ${isCurrent 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : isCompleted
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{skill.name}</span>
                        {isCompleted && !isCurrent && (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </div>
                      {isCompleted && (
                        <div className="text-xs mt-1 opacity-75">
                          Level: {selfEvaluations[skill.id]?.selfAssessedLevel}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {(assessment.questions || []).map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`
                      p-2 rounded text-center text-sm font-medium transition-colors
                      ${index === currentQuestionIndex 
                        ? 'bg-blue-600 text-white' 
                        : answers[question.id]
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }
                    `}
                  >
                    {answers[question.id] && index !== currentQuestionIndex && (
                      <CheckCircle className="h-4 w-4 mx-auto mb-1" />
                    )}
                    Q{index + 1}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Feedback Modal */}
        <AIFeedbackModal
          open={aiFeedbackModal.open}
          onOpenChange={(open) => setAiFeedbackModal(prev => ({ ...prev, open }))}
          feedback={aiFeedbackModal.feedback}
          hasRiskyContent={aiFeedbackModal.hasRiskyContent}
          skillName={aiFeedbackModal.skillName}
          selectedLevel={aiFeedbackModal.selectedLevel}
          onContinue={handleAIFeedbackContinue}
          isLastSkill={currentSkillIndex === assessmentComponentSkills.length - 1}
        />
      </div>
    </div>
  );
}