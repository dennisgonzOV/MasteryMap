// Grading Interface Component - Modularized for assessments domain
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Sparkles, User, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  text: string;
  type: 'open-ended' | 'multiple-choice' | 'short-answer';
  rubricCriteria?: string;
  sampleAnswer?: string;
}

interface Submission {
  id: number;
  studentId: number;
  studentName: string;
  submittedAt: string;
  answers: Record<string, string>;
  status: 'pending' | 'graded' | 'reviewed';
}

interface GradingInterfaceProps {
  submission: Submission;
  questions: Question[];
  onGradeSubmission: (submissionId: number, grades: Array<{
    questionId: string;
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    score: number;
  }>) => void;
}

export function GradingInterface({ 
  submission, 
  questions, 
  onGradeSubmission
}: GradingInterfaceProps) {
  const { toast } = useToast();
  const [grades, setGrades] = useState<Record<string, {
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    score: number;
  }>>({});
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState<Record<string, boolean>>({});

  const rubricLevels = [
    { value: 'emerging', label: 'Emerging', description: 'Beginning to show understanding', color: 'bg-red-100 text-red-800', score: 1 },
    { value: 'developing', label: 'Developing', description: 'Showing progress toward understanding', color: 'bg-yellow-100 text-yellow-800', score: 2 },
    { value: 'proficient', label: 'Proficient', description: 'Demonstrating solid understanding', color: 'bg-blue-100 text-blue-800', score: 3 },
    { value: 'applying', label: 'Applying', description: 'Applying understanding in new contexts', color: 'bg-green-100 text-green-800', score: 4 }
  ];

  const handleRubricLevelChange = (questionId: string, level: string) => {
    const rubricLevel = level as 'emerging' | 'developing' | 'proficient' | 'applying';
    const score = rubricLevels.find(r => r.value === rubricLevel)?.score || 1;
    
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        rubricLevel,
        score
      }
    }));
  };

  const handleFeedbackChange = (questionId: string, feedback: string) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        feedback
      }
    }));
  };

  const generateAIFeedback = async (questionId: string) => {
    setIsGeneratingFeedback(prev => ({ ...prev, [questionId]: true }));
    
    try {
      const question = questions.find(q => q.id === questionId);
      const studentAnswer = submission.answers[questionId];
      
      const response = await fetch(`/api/submissions/${submission.id}/generate-question-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          questionText: question?.text,
          studentAnswer,
          rubricCriteria: question?.rubricCriteria,
          sampleAnswer: question?.sampleAnswer
        })
      });

      if (response.ok) {
        const { feedback } = await response.json();
        handleFeedbackChange(questionId, feedback);
        toast({
          title: "AI Feedback Generated",
          description: "AI feedback has been generated for this question."
        });
      }
    } catch (error) {
      console.error('Error generating AI feedback:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingFeedback(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSubmitGrades = () => {
    const gradingData = questions.map(question => ({
      questionId: question.id,
      rubricLevel: grades[question.id]?.rubricLevel || 'emerging',
      feedback: grades[question.id]?.feedback || '',
      score: grades[question.id]?.score || 1
    }));

    onGradeSubmission(submission.id, gradingData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Student Information Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {submission.studentName}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Submitted: {formatDate(submission.submittedAt)}
            </div>
            <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
              {submission.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Questions and Grading */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Question {index + 1}
                </span>
                <Badge variant="outline">{question.type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Question Text */}
              <div>
                <Label className="font-medium">Question:</Label>
                <p className="mt-1 text-sm">{question.text}</p>
              </div>

              {/* Student Answer */}
              <div>
                <Label className="font-medium">Student Answer:</Label>
                <div className="mt-1 p-3 bg-muted rounded border">
                  <p className="text-sm whitespace-pre-wrap">
                    {submission.answers[question.id] || 'No answer provided'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Rubric Level Selection */}
              <div>
                <Label className="font-medium">Rubric Level:</Label>
                <RadioGroup
                  value={grades[question.id]?.rubricLevel || ''}
                  onValueChange={(value) => handleRubricLevelChange(question.id, value)}
                  className="mt-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {rubricLevels.map((level) => (
                      <div key={level.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={level.value} id={`${question.id}-${level.value}`} />
                        <Label 
                          htmlFor={`${question.id}-${level.value}`} 
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{level.label}</span>
                            <Badge className={level.color} variant="secondary">
                              {level.score}/4
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {level.description}
                          </p>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Feedback Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Feedback:</Label>
                  <Button
                    onClick={() => generateAIFeedback(question.id)}
                    disabled={isGeneratingFeedback[question.id]}
                    variant="outline"
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGeneratingFeedback[question.id] ? 'Generating...' : 'AI Feedback'}
                  </Button>
                </div>
                <Textarea
                  value={grades[question.id]?.feedback || ''}
                  onChange={(e) => handleFeedbackChange(question.id, e.target.value)}
                  placeholder="Provide feedback for this question..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmitGrades} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Grades & Feedback
        </Button>
      </div>
    </div>
  );
}