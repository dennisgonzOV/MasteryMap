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
  onGenerateAIFeedback: (submissionId: number, questionId: string, answer: string) => Promise<string>;
}

export default function GradingInterface({ 
  submission, 
  questions, 
  onGradeSubmission,
  onGenerateAIFeedback 
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
    if (!submission.answers[questionId]) return;

    setIsGeneratingFeedback(prev => ({ ...prev, [questionId]: true }));
    
    try {
      const feedback = await onGenerateAIFeedback(
        submission.id, 
        questionId, 
        submission.answers[questionId]
      );
      
      handleFeedbackChange(questionId, feedback);
      
      toast({
        title: "AI Feedback Generated",
        description: "You can edit the feedback before saving.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFeedback(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSubmitGrades = () => {
    const gradesList = Object.entries(grades).map(([questionId, grade]) => ({
      questionId,
      ...grade
    }));

    if (gradesList.length === 0) {
      toast({
        title: "No Grades",
        description: "Please grade at least one question before submitting.",
        variant: "destructive",
      });
      return;
    }

    onGradeSubmission(submission.id, gradesList);
    
    toast({
      title: "Grades Submitted",
      description: "Student has been notified of their grades and feedback.",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateOverallScore = () => {
    const gradedQuestions = Object.values(grades);
    if (gradedQuestions.length === 0) return 0;
    
    const totalScore = gradedQuestions.reduce((sum, grade) => sum + grade.score, 0);
    return Math.round((totalScore / (gradedQuestions.length * 4)) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Submission Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5" />
              <span>{submission.studentName}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(submission.submittedAt)}</span>
              </Badge>
              <Badge className={`${
                submission.status === 'graded' ? 'bg-green-100 text-green-800' :
                submission.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {submission.status}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Overall Score: <span className="font-medium">{calculateOverallScore()}%</span>
            </div>
            <div className="text-sm text-gray-600">
              Questions Graded: {Object.keys(grades).length} of {questions.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Grading */}
      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Question {index + 1}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Question Text */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">{question.text}</p>
              {question.rubricCriteria && (
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Rubric:</strong> {question.rubricCriteria}
                </p>
              )}
            </div>

            {/* Student Answer */}
            <div>
              <Label className="text-sm font-medium">Student Response</Label>
              <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-gray-800">
                  {submission.answers[question.id] || 'No response provided'}
                </p>
              </div>
            </div>

            {/* Sample Answer (if available) */}
            {question.sampleAnswer && (
              <div>
                <Label className="text-sm font-medium">Sample Answer</Label>
                <div className="mt-2 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-gray-800 text-sm">{question.sampleAnswer}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Rubric Grading */}
            <div>
              <Label className="text-sm font-medium">Rubric Level</Label>
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
                        <div className={`p-2 rounded-lg border ${level.color}`}>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs opacity-75">{level.description}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Feedback */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Feedback</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAIFeedback(question.id)}
                  disabled={isGeneratingFeedback[question.id] || !submission.answers[question.id]}
                  className="flex items-center space-x-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Generate AI Feedback</span>
                </Button>
              </div>
              <Textarea
                value={grades[question.id]?.feedback || ''}
                onChange={(e) => handleFeedbackChange(question.id, e.target.value)}
                placeholder="Provide specific feedback to help the student improve..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmitGrades}
          disabled={Object.keys(grades).length === 0}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          <span>Submit Grades & Feedback</span>
        </Button>
      </div>
    </div>
  );
}