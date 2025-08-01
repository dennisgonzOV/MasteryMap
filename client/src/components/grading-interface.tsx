import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Sparkles, User, Clock, FileText, Edit, Lock } from 'lucide-react';
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

interface ComponentSkill {
  id: number;
  name: string;
  competencyName?: string;
  learnerOutcomeName?: string;
}

interface GradingInterfaceProps {
  submission: Submission;
  questions: Question[];
  componentSkills: ComponentSkill[];
  onGradeSubmission: (submissionId: number, grades: Array<{
    componentSkillId: number;
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    score: number;
  }>) => void;
}

export default function GradingInterface({ 
  submission, 
  questions, 
  componentSkills,
  onGradeSubmission
}: GradingInterfaceProps) {
  const { toast } = useToast();
  const [grades, setGrades] = useState<Record<string, {
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    score: number;
  }>>({});
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState<Record<string, boolean>>({});
  const [existingGrades, setExistingGrades] = useState<Array<{
    id: number;
    componentSkillId: number;
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    score: number;
    feedback: string;
  }>>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [editingSkill, setEditingSkill] = useState<number | null>(null);

  const rubricLevels = [
    { value: 'emerging', label: 'Emerging', description: 'Beginning to show understanding', color: 'bg-red-100 text-red-800', score: 1 },
    { value: 'developing', label: 'Developing', description: 'Showing progress toward understanding', color: 'bg-yellow-100 text-yellow-800', score: 2 },
    { value: 'proficient', label: 'Proficient', description: 'Demonstrating solid understanding', color: 'bg-blue-100 text-blue-800', score: 3 },
    { value: 'applying', label: 'Applying', description: 'Applying understanding in new contexts', color: 'bg-green-100 text-green-800', score: 4 }
  ];

  // Fetch existing grades on component mount
  useEffect(() => {
    const fetchExistingGrades = async () => {
      try {
        const response = await fetch(`/api/submissions/${submission.id}/grades`);
        if (response.ok) {
          const existingGrades = await response.json();
          setExistingGrades(existingGrades);
          
          // Populate grades state with existing data
          const gradesMap: Record<string, any> = {};
          existingGrades.forEach((grade: any) => {
            gradesMap[grade.componentSkillId.toString()] = {
              rubricLevel: grade.rubricLevel,
              feedback: grade.feedback || '',
              score: grade.score
            };
          });
          setGrades(gradesMap);
          
          // Lock interface if grades already exist
          if (existingGrades.length > 0) {
            setIsLocked(true);
          }
        }
      } catch (error) {
        console.error('Error fetching existing grades:', error);
      }
    };

    if (submission.id) {
      fetchExistingGrades();
    }
  }, [submission.id]);

  const handleRubricLevelChange = (componentSkillId: number, level: string) => {
    if (isLocked && editingSkill !== componentSkillId) return;
    
    const rubricLevel = level as 'emerging' | 'developing' | 'proficient' | 'applying';
    const score = rubricLevels.find(r => r.value === rubricLevel)?.score || 1;
    
    setGrades(prev => ({
      ...prev,
      [componentSkillId.toString()]: {
        ...prev[componentSkillId.toString()],
        rubricLevel,
        score
      }
    }));
  };

  const handleFeedbackChange = (componentSkillId: number, feedback: string) => {
    if (isLocked && editingSkill !== componentSkillId) return;
    
    setGrades(prev => ({
      ...prev,
      [componentSkillId.toString()]: {
        ...prev[componentSkillId.toString()],
        feedback
      }
    }));
  };

  const handleEditSkill = (componentSkillId: number) => {
    setEditingSkill(componentSkillId);
  };

  const handleSaveSkill = (componentSkillId: number) => {
    setEditingSkill(null);
  };

  const handleCancelEdit = (componentSkillId: number) => {
    // Restore original grade data
    const existingGrade = existingGrades.find(g => g.componentSkillId === componentSkillId);
    if (existingGrade) {
      setGrades(prev => ({
        ...prev,
        [componentSkillId.toString()]: {
          rubricLevel: existingGrade.rubricLevel,
          feedback: existingGrade.feedback,
          score: existingGrade.score
        }
      }));
    }
    setEditingSkill(null);
  };

  const generateAIFeedback = async (questionId: string) => {
    if (!submission.answers[questionId]) return;

    setIsGeneratingFeedback(prev => ({ ...prev, [questionId]: true }));
    
    try {
      const question = questions.find(q => q.id === questionId);
      
      const response = await fetch(`/api/submissions/${submission.id}/generate-question-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          answer: submission.answers[questionId],
          rubricCriteria: question?.rubricCriteria,
          sampleAnswer: question?.sampleAnswer
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI feedback');
      }

      const data = await response.json();
      handleFeedbackChange(questionId, data.feedback);
      
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
    const gradesList = Object.entries(grades).map(([componentSkillId, grade]) => ({
      componentSkillId: parseInt(componentSkillId),
      ...grade
    }));

    if (gradesList.length === 0) {
      toast({
        title: "No Grades",
        description: "Please grade at least one component skill before submitting.",
        variant: "destructive",
      });
      return;
    }

    onGradeSubmission(submission.id, gradesList);
    
    // Lock the interface after successful submission
    setIsLocked(true);
    setEditingSkill(null);
    
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
              Skills Graded: {Object.keys(grades).length} of {componentSkills.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Skill Grading */}
      {componentSkills.map((skill, index) => (
        <Card key={skill.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{skill.name}</span>
                {isLocked && editingSkill !== skill.id && (
                  <Lock className="h-4 w-4 text-gray-500" />
                )}
              </div>
              {isLocked && (
                <div className="flex items-center space-x-2">
                  {editingSkill === skill.id ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveSkill(skill.id)}
                        className="flex items-center space-x-1"
                      >
                        <Save className="h-3 w-3" />
                        <span>Save</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelEdit(skill.id)}
                        className="flex items-center space-x-1"
                      >
                        <span>Cancel</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSkill(skill.id)}
                      className="flex items-center space-x-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
              )}
            </CardTitle>
            {skill.competencyName && (
              <p className="text-sm text-gray-600">
                {skill.learnerOutcomeName} → {skill.competencyName}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student Responses for this skill */}
            <div>
              <Label className="text-sm font-medium">Student Responses</Label>
              <div className="mt-2 space-y-2">
                {questions.map((question, qIndex) => (
                  <div key={question.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-gray-900 mb-1">Question {qIndex + 1}: {question.text}</p>
                    <p className="text-gray-800 text-sm">
                      {submission.answers[question.id] || 'No response provided'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Rubric Grading */}
            <div>
              <Label className="text-sm font-medium">Rubric Level</Label>
              <RadioGroup
                value={grades[skill.id.toString()]?.rubricLevel || ''}
                onValueChange={(value) => handleRubricLevelChange(skill.id, value)}
                disabled={isLocked && editingSkill !== skill.id}
                className="mt-2"
              >
                <div className="grid grid-cols-2 gap-3">
                  {rubricLevels.map((level) => (
                    <div key={level.value} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={level.value} 
                        id={`${skill.id}-${level.value}`}
                        disabled={isLocked && editingSkill !== skill.id}
                      />
                      <Label 
                        htmlFor={`${skill.id}-${level.value}`}
                        className={`flex-1 ${isLocked && editingSkill !== skill.id ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <div className={`p-2 rounded-lg border ${level.color} ${isLocked && editingSkill !== skill.id ? 'opacity-60' : ''}`}>
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
                  onClick={() => generateAIFeedback(skill.id.toString())}
                  disabled={isGeneratingFeedback[skill.id.toString()] || (isLocked && editingSkill !== skill.id)}
                  className="flex items-center space-x-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Generate AI Feedback</span>
                </Button>
              </div>
              <Textarea
                value={grades[skill.id.toString()]?.feedback || ''}
                onChange={(e) => handleFeedbackChange(skill.id, e.target.value)}
                placeholder="Provide specific feedback to help the student improve..."
                disabled={isLocked && editingSkill !== skill.id}
                className={`mt-2 min-h-[100px] ${isLocked && editingSkill !== skill.id ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmitGrades}
          disabled={Object.keys(grades).length === 0 || isLocked}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          <span>{isLocked ? 'Grades Submitted' : 'Submit Grades & Feedback'}</span>
        </Button>
      </div>
    </div>
  );
}