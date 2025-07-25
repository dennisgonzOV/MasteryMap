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
  Download,
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
  });



  const handleShareAssessment = async () => {
    const shareUrl = `${window.location.origin}/assessment/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Assessment link copied!",
        description: "Students can use this link to access the assessment after logging in.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportResults = async () => {
    try {
      const response = await fetch(`/api/assessments/${id}/export-detailed-results`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assessment.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-detailed-results-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: "Detailed assessment results have been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export detailed results. Please try again.",
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
  const completedSubmissions = submissions.filter(s => s.grade !== undefined).length;
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
                  <span className="text-gray-700">{assessment.questions.length} questions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{totalStudents} submissions</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleShareAssessment}
                className="flex items-center space-x-2"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center space-x-2"
                onClick={handleExportResults}
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
              <Button
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation(`/teacher/assessments/${id}/grade`)}
              >
                <Eye className="h-4 w-4" />
                <span>Grade Submissions</span>
              </Button>
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
                  {assessment.questions.map((question, index) => (
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Grade</span>
                    <span className="font-semibold text-blue-600">{averageGrade.toFixed(1)}%</span>
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
                        {submission.grade !== undefined ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600">
                              {submission.grade}%
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