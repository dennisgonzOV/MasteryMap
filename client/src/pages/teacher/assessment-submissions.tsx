import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye,
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  Star,
  Brain,
  Zap,
  MessageSquare,
  Save,
  RotateCcw,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { queryClient } from "@/lib/queryClient";

interface Assessment {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    rubricCriteria?: string;
  }>;
  componentSkillIds: number[];
}

interface ComponentSkill {
  id: number;
  name: string;
  rubricLevels: {
    emerging: string;
    developing: string;
    proficient: string;
    applying: string;
  };
}

interface Grade {
  id: number;
  componentSkillId: number;
  rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
  score: string;
  feedback: string;
  gradedBy: number;
  gradedAt: string;
}

interface Submission {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  responses: Array<{
    questionId: string;
    answer: string;
  }>;
  grades?: Grade[];
  feedback?: string;
  isLate: boolean;
  aiGeneratedFeedback?: boolean;
}

const rubricLevels = [
  { 
    value: 'emerging' as const, 
    label: 'Emerging', 
    description: 'Beginning to show understanding', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    score: 1 
  },
  { 
    value: 'developing' as const, 
    label: 'Developing', 
    description: 'Showing progress toward understanding', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    score: 2 
  },
  { 
    value: 'proficient' as const, 
    label: 'Proficient', 
    description: 'Demonstrating solid understanding', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    score: 3 
  },
  { 
    value: 'applying' as const, 
    label: 'Applying', 
    description: 'Applying understanding in new contexts', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    score: 4 
  }
];

export default function AssessmentSubmissions() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // State for UI interactions
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<number>>(new Set());
  const [gradingData, setGradingData] = useState<Record<number, Record<number, {
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    score: number;
  }>>>({});
  const [bulkGradingProgress, setBulkGradingProgress] = useState(0);
  const [isBulkGrading, setIsBulkGrading] = useState(false);

  // Fetch assessment data
  const { data: assessment, isLoading: assessmentLoading } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${id}`],
    enabled: isAuthenticated && !!id,
  });

  // Fetch submissions
  const { data: submissions = [], isLoading: submissionsLoading, refetch: refetchSubmissions } = useQuery<Submission[]>({
    queryKey: [`/api/assessments/${id}/submissions`],
    enabled: isAuthenticated && !!id,
  });

  // Fetch component skills for the assessment
  const { data: componentSkills = [] } = useQuery<ComponentSkill[]>({
    queryKey: ['/api/component-skills/details'],
    enabled: isAuthenticated && !!assessment?.componentSkillIds?.length,
  });

  // Filter component skills relevant to this assessment
  const relevantSkills = componentSkills.filter(skill => 
    assessment?.componentSkillIds?.includes(skill.id)
  );

  // Individual grading mutation
  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, grades }: {
      submissionId: number;
      grades: Array<{
        componentSkillId: number;
        rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
        feedback: string;
        score: number;
      }>;
    }) => {
      const response = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades, generateAiFeedback: false }),
      });
      if (!response.ok) throw new Error('Failed to grade submission');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Submission graded successfully" });
      refetchSubmissions();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to grade submission", variant: "destructive" });
    },
  });

  // AI grading mutation for individual submission
  const aiGradeMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAiFeedback: true }),
      });
      if (!response.ok) throw new Error('Failed to AI grade submission');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "AI grading completed" });
      refetchSubmissions();
    },
    onError: () => {
      toast({ title: "Error", description: "AI grading failed", variant: "destructive" });
    },
  });

  // Bulk AI grading mutation
  const bulkGradeMutation = useMutation({
    mutationFn: async () => {
      setIsBulkGrading(true);
      setBulkGradingProgress(0);
      
      const ungradedSubmissions = submissions.filter(sub => 
        !sub.grades?.length
      );
      const total = ungradedSubmissions.length;
      
      for (let i = 0; i < ungradedSubmissions.length; i++) {
        const submission = ungradedSubmissions[i];
        try {
          await fetch(`/api/submissions/${submission.id}/grade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generateAiFeedback: true }),
          });
        } catch (error) {
          console.error(`Failed to grade submission ${submission.id}:`, error);
        }
        setBulkGradingProgress(((i + 1) / total) * 100);
      }
      
      setIsBulkGrading(false);
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Bulk AI grading completed" });
      refetchSubmissions();
    },
    onError: () => {
      toast({ title: "Error", description: "Bulk grading failed", variant: "destructive" });
      setIsBulkGrading(false);
    },
  });

  // Helper functions
  const toggleSubmissionExpansion = (submissionId: number) => {
    const newExpanded = new Set(expandedSubmissions);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedSubmissions(newExpanded);
  };

  const updateGradingData = (submissionId: number, skillId: number, data: {
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    score: number;
  }) => {
    setGradingData(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [skillId]: data
      }
    }));
  };

  const handleManualGrade = (submissionId: number) => {
    const submissionGrades = gradingData[submissionId];
    if (!submissionGrades) return;

    const grades = Object.entries(submissionGrades).map(([skillId, gradeData]) => ({
      componentSkillId: parseInt(skillId),
      ...gradeData
    }));

    gradeMutation.mutate({ submissionId, grades });
  };

  const getRubricLevelBadge = (level: string) => {
    const levelConfig = rubricLevels.find(r => r.value === level);
    if (!levelConfig) return null;
    
    return (
      <Badge className={`${levelConfig.color} border`}>
        {levelConfig.label}
      </Badge>
    );
  };

  const getSubmissionStats = () => {
    const total = submissions.length;
    const graded = submissions.filter(sub => 
      sub.grades?.length
    ).length;
    const ungraded = total - graded;
    const aiGraded = submissions.filter(sub => sub.aiGeneratedFeedback).length;
    
    return { total, graded, ungraded, aiGraded };
  };

  const handleViewSubmission = (submissionId: number) => {
    setLocation(`/teacher/assessments/${id}/submissions/${submissionId}`);
  };

  const getAverageScore = (submission: Submission) => {
    if (!submission.grades?.length) return null;
    const totalScore = submission.grades.reduce((sum, grade) => sum + parseFloat(grade.score), 0);
    return Math.round((totalScore / submission.grades.length) * 25); // Convert to percentage (4 levels * 25%)
  };

  if (assessmentLoading || submissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading submissions...</span>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Not Found</h2>
            <p className="text-gray-600 mb-4">
              The assessment you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => setLocation('/teacher/assessments')}>
              Back to Assessments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getSubmissionStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => setLocation(`/teacher/assessments/${id}`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Assessment</span>
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Grading: {assessment.title}
              </h1>
              <p className="text-gray-600 mb-4">{assessment.description}</p>

              {/* Quick Stats */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{stats.total} submissions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700">{stats.graded} graded</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-700">{stats.ungraded} pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    Due: {format(new Date(assessment.dueDate), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Grading Controls */}
        {stats.ungraded > 0 && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Zap className="h-5 w-5" />
                <span>Bulk AI Grading</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-blue-700">
                  Use AI to automatically grade all {stats.ungraded} ungraded submissions. 
                  The AI will analyze student responses against the rubric criteria and provide 
                  personalized feedback for each submission.
                </p>
                
                {isBulkGrading && (
                  <div className="space-y-3">
                    <Progress value={bulkGradingProgress} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">
                        AI grading in progress...
                      </span>
                      <span className="font-medium text-blue-800">
                        {Math.round(bulkGradingProgress)}% Complete
                      </span>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={() => bulkGradeMutation.mutate()}
                  disabled={isBulkGrading || stats.ungraded === 0}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Brain className="h-4 w-4" />
                  <span>
                    {isBulkGrading 
                      ? 'Grading in Progress...' 
                      : `Grade ${stats.ungraded} Submissions with AI`
                    }
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submissions List */}
        <div className="space-y-6">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
                <p className="text-gray-500">
                  Students haven't submitted their responses for this assessment yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            submissions.map((submission) => {
              const isExpanded = expandedSubmissions.has(submission.id);
              const averageScore = getAverageScore(submission);
              
              return (
                <Card key={submission.id} className="overflow-hidden">
                  {/* Submission Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {submission.studentName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{submission.studentName}</h3>
                          <p className="text-sm text-gray-500">{submission.studentEmail}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              Submitted: {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
                            </span>
                            {submission.isLate && (
                              <Badge variant="destructive" className="text-xs">
                                Late
                              </Badge>
                            )}
                            {submission.aiGeneratedFeedback && (
                              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                AI Graded
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Grade Status */}
                        <div className="text-right">
                          {submission.grades?.length ? (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <span className="text-lg font-semibold text-green-600">
                                {Math.round(submission.grades.reduce((sum, g) => sum + (parseFloat(g.score) || 0), 0) / submission.grades.length * 25)}%
                              </span>
                            </div>
                          ) : averageScore !== null ? (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <span className="text-lg font-semibold text-green-600">{averageScore}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5 text-orange-500" />
                              <span className="text-orange-600 font-medium">Ungraded</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          {!submission.grades?.length && (
                            <Button
                              size="sm"
                              onClick={() => aiGradeMutation.mutate(submission.id)}
                              disabled={aiGradeMutation.isPending}
                              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                            >
                              <Brain className="h-4 w-4" />
                              <span>{aiGradeMutation.isPending ? 'Grading...' : 'AI Grade'}</span>
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleSubmissionExpansion(submission.id)}
                            className="flex items-center space-x-2"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>{isExpanded ? 'Collapse' : 'Review'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Submission Content */}
                  {isExpanded && (
                    <div className="p-6 bg-gray-50 space-y-6">
                      {/* Student Responses */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                          <MessageSquare className="h-5 w-5" />
                          <span>Student Responses</span>
                        </h4>
                        
                        {assessment?.questions?.map((question, index) => {
                          const response = submission.responses?.find(r => r.questionId === question.id);
                          
                          return (
                            <Card key={question.id} className="bg-white">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start space-x-3">
                                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 mb-2">{question.text}</h5>
                                    {question.rubricCriteria && (
                                      <p className="text-sm text-gray-600 mb-3">
                                        <strong>Rubric:</strong> {question.rubricCriteria}
                                      </p>
                                    )}
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                      <p className="text-gray-800">
                                        {response?.answer || 'No response provided'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* Current Grades Display */}
                      {submission.grades && submission.grades.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Star className="h-5 w-5" />
                            <span>Current Grades</span>
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {submission.grades?.map((grade) => {
                              const skill = relevantSkills.find(s => s.id === grade.componentSkillId);
                              
                              return (
                                <Card key={grade.id} className="bg-white">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h6 className="font-medium text-gray-900">{skill?.name}</h6>
                                      {getRubricLevelBadge(grade.rubricLevel)}
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-lg font-semibold text-gray-900">
                                        Score: {grade.score}/4
                                      </div>
                                      {grade.feedback && (
                                        <div className="bg-gray-50 p-3 rounded border">
                                          <p className="text-sm text-gray-700">{grade.feedback}</p>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Manual Grading Interface */}
                      {!submission.grades?.length && relevantSkills.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <GraduationCap className="h-5 w-5" />
                            <span>Manual Grading</span>
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {relevantSkills.map((skill) => (
                              <Card key={skill.id} className="bg-white">
                                <CardContent className="p-4 space-y-4">
                                  <h6 className="font-medium text-gray-900">{skill.name}</h6>
                                  
                                  <div className="space-y-3">
                                    <div>
                                      <Label className="text-sm font-medium">Rubric Level</Label>
                                      <Select
                                        value={gradingData[submission.id]?.[skill.id]?.rubricLevel || ''}
                                        onValueChange={(value: 'emerging' | 'developing' | 'proficient' | 'applying') => {
                                          const level = rubricLevels.find(r => r.value === value);
                                          updateGradingData(submission.id, skill.id, {
                                            rubricLevel: value,
                                            score: level?.score || 1,
                                            feedback: gradingData[submission.id]?.[skill.id]?.feedback || ''
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {rubricLevels.map((level) => (
                                            <SelectItem key={level.value} value={level.value}>
                                              <div className="flex items-center space-x-2">
                                                <Badge className={level.color}>
                                                  {level.label}
                                                </Badge>
                                                <span className="text-sm">{level.description}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div>
                                      <Label className="text-sm font-medium">Feedback</Label>
                                      <Textarea
                                        placeholder="Provide specific feedback for this skill..."
                                        value={gradingData[submission.id]?.[skill.id]?.feedback || ''}
                                        onChange={(e) => {
                                          const current = gradingData[submission.id]?.[skill.id];
                                          updateGradingData(submission.id, skill.id, {
                                            rubricLevel: current?.rubricLevel || 'emerging',
                                            score: current?.score || 1,
                                            feedback: e.target.value
                                          });
                                        }}
                                        className="resize-none"
                                        rows={3}
                                      />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          
                          <div className="flex justify-end space-x-3">
                            <Button
                              variant="outline"
                              onClick={() => setGradingData(prev => ({ ...prev, [submission.id]: {} }))}
                              className="flex items-center space-x-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>Reset</span>
                            </Button>
                            
                            <Button
                              onClick={() => handleManualGrade(submission.id)}
                              disabled={gradeMutation.isPending || !gradingData[submission.id] || Object.keys(gradingData[submission.id] || {}).length === 0}
                              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-4 w-4" />
                              <span>{gradeMutation.isPending ? 'Saving...' : 'Save Grade'}</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
