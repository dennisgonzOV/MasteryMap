import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import Navigation from "@/components/navigation";
import ProjectCard from "@/components/project-card";
import CredentialBadge from "@/components/credential-badge";
import ProgressBar from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Award, 
  TrendingUp,
  Clock,
  Target,
  Brain,
  Users,
  ArrowRight,
  Star,
  Trophy,
  AlertCircle,
  Hash,
  FileText
} from "lucide-react";

export default function StudentDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user, isNetworkError, isAuthError, hasError } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Handle network errors
  useEffect(() => {
    if (isNetworkError) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    }
  }, [isNetworkError, toast]);

  // Redirect to login if authentication error
  useEffect(() => {
    if (!isLoading && isAuthError) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    if (!isLoading && !isAuthenticated && !isNetworkError) {
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, isLoading, isAuthError, isNetworkError, setLocation, toast]);

  // Fetch student projects
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  // Fetch student credentials
  const { data: credentials = [], isLoading: credentialsLoading } = useQuery({
    queryKey: ["/api/credentials/student"],
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  // Fetch portfolio artifacts
  const { data: artifacts = [] } = useQuery({
    queryKey: ["/api/portfolio/artifacts"],
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (projectsError && isUnauthorizedError(projectsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
    }
  }, [projectsError, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (user?.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to students.</p>
        </div>
      </div>
    );
  }

  // Use real competency progress data from API
  const { data: competencyProgress = [] } = useQuery({
    queryKey: ["/api/competency-progress/student", user?.id],
    enabled: isAuthenticated && user?.role === 'student' && !!user?.id,
    retry: false,
  });

  // Fetch upcoming deadlines
  const { data: upcomingDeadlines = [] } = useQuery({
    queryKey: ["/api/deadlines/student"],
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  const recentCredentials = credentials.slice(0, 3);
  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user.firstName}!
                </h1>
                <p className="text-gray-600">
                  Continue your learning journey and track your progress across all projects.
                </p>
              </div>
              
              {/* Assessment Code Entry */}
              <div className="lg:min-w-0 lg:flex-shrink-0">
                <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 p-3 rounded-full">
                        <Hash className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Join Assessment</h3>
                        <p className="text-white/90 text-sm mb-3">Enter your teacher's 5-letter code</p>
                        <Link href="/student/enter-code">
                          <Button 
                            size="sm" 
                            className="bg-white text-blue-600 hover:bg-white/90 font-medium"
                          >
                            Enter Code
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          

          

          
        {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 font-medium">Active Projects</p>
                    <p className="text-2xl font-bold text-green-700">{activeProjects.length}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 font-medium">Credentials</p>
                    <p className="text-2xl font-bold text-blue-700">{credentials.length}</p>
                  </div>
                  <Award className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 font-medium">Portfolio Items</p>
                    <p className="text-2xl font-bold text-purple-700">{artifacts.length}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-600 font-medium">Upcoming</p>
                    <p className="text-2xl font-bold text-orange-700">{upcomingDeadlines.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <div className="space-y-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'assessments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('assessments')}
                >
                  My Assessments
                </button>
              </nav>
            </div>

            {/* Conditional Tab Content */}
            {activeTab === 'assessments' && <AssessmentsTab />}

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Active Projects */}
              {activeProjects.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Active Projects</h2>
                    <Link href="/student/projects">
                      <Button variant="outline" size="sm">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeProjects.slice(0, 3).map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Credentials */}
              {recentCredentials.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Recent Credentials</h2>
                    <Link href="/student/portfolio">
                      <Button variant="outline" size="sm">
                        View Portfolio
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recentCredentials.map((credential) => (
                      <CredentialBadge key={credential.id} credential={credential} />
                    ))}
                  </div>
                </div>
              )}

              {/* Competency Progress */}
              {competencyProgress.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Your Progress</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {competencyProgress.slice(0, 4).map((progress, index) => (
                      <Card key={index}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {progress.competencyName}
                            </h3>
                            <Badge variant="secondary">
                              {progress.averageScore}%
                            </Badge>
                          </div>
                          <ProgressBar progress={progress.averageScore} className="mb-2" />
                          <div className="flex items-center text-sm text-gray-600">
                            <Brain className="h-4 w-4 mr-1" />
                            <span>{progress.submissionCount} submissions</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Deadlines */}
              {upcomingDeadlines.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Upcoming Deadlines</h2>
                  </div>
                  <Card>
                    <CardContent className="p-0">
                      {upcomingDeadlines.slice(0, 5).map((deadline, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-red-100 rounded-full">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{deadline.title}</h4>
                              <p className="text-sm text-gray-600">{deadline.projectTitle}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            {new Date(deadline.dueDate).toLocaleDateString()}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Assessments Tab Component
function AssessmentsTab() {
  const { user } = useAuth();
  
  // Fetch student's assessment submissions
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["/api/student/assessment-submissions", user?.id],
    queryFn: () => api.getStudentAssessmentSubmissions(user!.id),
    enabled: !!user?.id,
    retry: false,
  });

  // Filter submissions to show only active and complete assessments
  const filteredSubmissions = submissions.filter((submission) => {
    // Show assessments that are either:
    // 1. Active (submitted but not yet graded)
    // 2. Complete (graded)
    return submission.status === 'submitted' || submission.status === 'graded';
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading assessments...</span>
      </div>
    );
  }

  if (filteredSubmissions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active or Complete Assessments</h3>
            <p className="text-gray-600">You don't have any active or completed assessments yet. Check back later!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {filteredSubmissions.map((submission) => (
        <AssessmentSubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}

// Assessment Submission Card Component
function AssessmentSubmissionCard({ submission }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'graded':
        return <Badge className="bg-green-100 text-green-800">Graded</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{submission.assessmentTitle}</CardTitle>
              <p className="text-gray-600 text-sm">
                {submission.projectTitle && `From: ${submission.projectTitle}`}
              </p>
              <p className="text-xs text-gray-500">
                Submitted: {new Date(submission.submittedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {submission.status === 'graded' && submission.totalScore !== null && (
              <Badge className={getScoreBadge(submission.totalScore)}>
                {submission.totalScore}%
              </Badge>
            )}
            {getStatusBadge(submission.status)}
            <Button variant="ghost" size="sm">
              {isExpanded ? 'Collapse' : 'View Details'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-6">
            {/* Earned Credentials */}
            {submission.earnedCredentials && submission.earnedCredentials.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Star className="h-5 w-5 text-yellow-500 mr-2" />
                  Stickers & Credentials Earned
                </h4>
                <div className="flex flex-wrap gap-3">
                  {submission.earnedCredentials.map((credential) => (
                    <div key={credential.id} className="flex items-center space-x-2 bg-yellow-50 px-3 py-2 rounded-full border border-yellow-200">
                      {credential.type === 'sticker' && <Star className="h-4 w-4 text-yellow-500" />}
                      {credential.type === 'badge' && <Award className="h-4 w-4 text-blue-500" />}
                      {credential.type === 'plaque' && <Trophy className="h-4 w-4 text-purple-500" />}
                      <span className="text-sm font-medium">{credential.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions and Responses */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Questions & Your Responses</h4>
              <div className="space-y-4">
                {submission.questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 mb-2">
                        Question {index + 1}: {question.text}
                      </h5>
                      {question.type === 'multiple-choice' && question.options && (
                        <p className="text-sm text-gray-600">
                          Options: {question.options.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
                      <p className="text-gray-900">
                        {submission.responses[question.id] || "No answer provided"}
                      </p>
                    </div>

                    {submission.status === 'graded' && submission.questionGrades && submission.questionGrades[question.id] && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Score:</span>
                          <Badge className={getScoreBadge(submission.questionGrades[question.id].score)}>
                            {submission.questionGrades[question.id].score}%
                          </Badge>
                        </div>
                        {submission.questionGrades[question.id].rubricLevel && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Rubric Level:</span>
                            <Badge variant="outline">
                              {submission.questionGrades[question.id].rubricLevel}
                            </Badge>
                          </div>
                        )}
                        {submission.questionGrades[question.id].feedback && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-1">Teacher Feedback:</p>
                            <p className="text-sm text-blue-800">
                              {submission.questionGrades[question.id].feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
