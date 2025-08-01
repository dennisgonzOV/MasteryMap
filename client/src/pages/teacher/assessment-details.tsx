import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  Share2, 
  Eye,
  GraduationCap,
  Lightbulb,
  ChevronRight,
  FileText,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getCompetencyInfo } from "@/lib/competencyUtils";

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
    sampleAnswer?: string;
  }>;
  componentSkillIds: number[];
  aiGenerated: boolean;
  createdAt: string;
  milestoneId?: number;
  shareCode?: string;
  shareCodeExpiresAt?: string;
}

interface ComponentSkill {
  id: number;
  name: string;
  competencyId: number;
  competencyName: string;
  competencyCategory: string;
  learnerOutcomeName: string;
  learnerOutcomeType: string;
}

interface Submission {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  answers: Record<string, string>;
  grade?: number;
  feedback?: string;
  isLate: boolean;
}

export default function AssessmentDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [shareCode, setShareCode] = useState<string | null>(null);

  // Fetch assessment data
  const { data: assessment, isLoading: assessmentLoading, error: assessmentError } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${id}`],
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  // Fetch component skills with competency details
  const { data: componentSkillsDetails = [] } = useQuery<ComponentSkill[]>({
    queryKey: ["/api/component-skills/details"],
    enabled: isAuthenticated,
  });

  // Fetch submissions
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: [`/api/assessments/${id}/submissions`],
    enabled: isAuthenticated && !!id,
    refetchInterval: 5000, // Refetch every 5 seconds to keep status updated
  });

  // Set existing share code when assessment loads
  useEffect(() => {
    if (assessment?.shareCode && assessment?.shareCodeExpiresAt) {
      const expiresAt = new Date(assessment.shareCodeExpiresAt);
      if (expiresAt > new Date()) {
        setShareCode(assessment.shareCode);
      }
    }
  }, [assessment]);



  const handleCopyShareCode = async () => {
    if (!shareCode) return;
    
    try {
      await navigator.clipboard.writeText(shareCode);
      toast({
        title: "Share code copied!",
        description: `Students can enter this code: ${shareCode}`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy share code",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  

  if (assessmentLoading || submissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading assessment...</span>
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

  const competencyGroups = getCompetencyInfo(assessment, componentSkillsDetails);
  const totalStudents = submissions.length;
  const completedSubmissions = submissions.filter(s => 
    (s.grade !== undefined && s.grade !== null) || (s.grades && s.grades.length > 0)
  ).length;
  const lateSubmissions = submissions.filter(s => s.isLate).length;
  const averageGrade = submissions.length > 0 
    ? submissions.reduce((sum, s) => sum + (s.grade || 0), 0) / submissions.length 
    : 0;

  const isOverdue = assessment.dueDate && new Date(assessment.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/teacher/assessments')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Assessments</span>
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
              </div>
              <p className="text-gray-600 text-lg mb-4">{assessment.description}</p>

              {/* Quick Stats */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                    Due: {format(new Date(assessment.dueDate), 'MMM d, yyyy h:mm a')}
                  </span>
                  {isOverdue && (
                    <Badge variant="destructive" className="ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      Late Submission
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{assessment.questions?.length || 0} questions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{totalStudents} submissions</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {shareCode && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg px-3 py-2">
                  <Share2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Code:</span>
                  <div 
                    className="bg-white px-3 py-1 rounded-md border-2 border-green-300 cursor-pointer hover:bg-green-50 transition-colors"
                    onClick={handleCopyShareCode}
                    title="Click to copy code"
                  >
                    <span className="font-mono font-bold text-green-800 text-lg">{shareCode}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Assessment Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills Being Demonstrated */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Skills You'll Demonstrate</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {competencyGroups.map((competency: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-5 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {competency.competencyName}
                            </h3>
                            <Badge 
                              variant="outline" 
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            >
                              {competency.competencyCategory}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 font-medium mb-3">
                            {competency.learnerOutcomeName}
                          </p>

                          {/* Specific Skills */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Specific skills:</h4>
                            <div className="flex flex-wrap gap-2">
                              {competency.skills.map((skill: ComponentSkill) => (
                                <Badge 
                                  key={skill.id}
                                  variant="secondary"
                                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs px-3 py-1"
                                >
                                  {skill.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Assessment Questions */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Assessment Questions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(assessment.questions || []).map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium mb-2">{question.text}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <Badge variant="outline" className="text-xs">
                              {question.type === 'multiple-choice' ? 'Multiple Choice' : 
                               question.type === 'short-answer' ? 'Short Answer' : 'Open Ended'}
                            </Badge>
                            {question.rubricCriteria && (
                              <span className="text-xs">Rubric: {question.rubricCriteria}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats and Submissions */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Assessment Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Submissions</span>
                    <span className="font-semibold text-gray-900">{totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Graded</span>
                    <span className="font-semibold text-green-600">{completedSubmissions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Late Submissions</span>
                    <span className="font-semibold text-red-600">{lateSubmissions}</span>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Completion Rate</span>
                      <span className="text-sm font-medium">{totalStudents > 0 ? Math.round((completedSubmissions / totalStudents) * 100) : 0}%</span>
                    </div>
                    <Progress value={totalStudents > 0 ? (completedSubmissions / totalStudents) * 100 : 0} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Submissions */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Submissions</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation(`/teacher/assessments/${id}/submissions`)}
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submissions.slice(0, 5).map((submission) => (
                    <div key={submission.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {submission.studentName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {submission.studentName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(submission.submittedAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {(submission.grade !== undefined && submission.grade !== null) || (submission.grades && submission.grades.length > 0) ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600">
                              {submission.grade !== undefined && submission.grade !== null 
                                ? `${submission.grade}%` 
                                : 'Graded'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600">Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {submissions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">No submissions yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}