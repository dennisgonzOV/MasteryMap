import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import { useAuthErrorHandling, useQueryErrorHandling } from "@/hooks/useErrorHandling";
import { FullscreenLoader } from "@/components/ui/loading-spinner";
import Navigation from "@/components/navigation";
import ProjectCard from "@/components/project-card";
import CredentialBadge from "@/components/credential-badge";
import ProgressBar from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  FileText,
  Search
} from "lucide-react";
import type {
  AssessmentDTO,
  CredentialDTO,
  MilestoneDTO,
  PortfolioArtifactDTO,
  ProjectDTO,
  StudentAssessmentSubmissionDTO,
} from "@shared/contracts/api";

type StudentProject = ProjectDTO;

interface StudentAssessmentQuestion {
  id: string | number;
  text: string;
  type?: string;
  options?: string[];
}

interface StudentAssessmentResponse {
  questionId: string | number;
  answer: string;
}

interface StudentAssessmentGrade {
  id: number;
  componentSkillName?: string | null;
  rubricLevel?: string | null;
  score?: string | number | null;
  feedback?: string | null;
}

type StudentSubmission = StudentAssessmentSubmissionDTO;

type MilestoneAssessment = AssessmentDTO & {
  description?: string | null;
  dueDate?: string | Date | null;
  xqRubricLevel?: string | null;
};

type ProjectMilestoneWithAssessments = MilestoneDTO & {
  status?: string | null;
  isCompleted?: boolean;
  assessments?: MilestoneAssessment[];
  deliverables?: string[] | null;
  xqRubricLevel?: string | null;
};

export default function StudentDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user, isNetworkError, isAuthError, hasError } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('assessments'); // Default to assessments tab
  const [searchQuery, setSearchQuery] = useState('');

  // Use centralized error handling
  useAuthErrorHandling(isLoading, isAuthenticated, { isNetworkError, isAuthError, hasError });

  // Fetch student projects
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery<StudentProject[]>({
    queryKey: ["/api/projects"],
    queryFn: api.getProjects,
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  // Fetch student credentials
  const { data: credentials = [], isLoading: credentialsLoading } = useQuery<CredentialDTO[]>({
    queryKey: ["/api/credentials/student"],
    queryFn: api.getStudentCredentials,
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  // Fetch portfolio artifacts
  const { data: artifacts = [] } = useQuery<PortfolioArtifactDTO[]>({
    queryKey: ["/api/portfolio/artifacts"],
    queryFn: api.getPortfolioArtifacts,
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  // Handle query errors
  useQueryErrorHandling(projectsError as Error);

  if (isLoading) {
    return <FullscreenLoader text="Loading..." />;
  }

  // Show loading while checking authentication
  if (!isAuthenticated || !user) {
    return <FullscreenLoader text="Authenticating..." />;
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
  const { data: competencyProgress = [] } = useQuery<Record<string, unknown>[]>({
    queryKey: ["/api/competency-progress/student", user?.id],
    enabled: isAuthenticated && user?.role === 'student' && !!user?.id,
    retry: false,
  });

  // Fetch upcoming deadlines
  const { data: upcomingDeadlines = [] } = useQuery<Record<string, unknown>[]>({
    queryKey: ["/api/deadlines/student"],
    queryFn: api.getStudentDeadlines,
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  const recentCredentials = credentials.slice(0, 3);
  const activeProjects = projects.filter((project) => project.status === 'active');

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
                  Welcome back, {user.username}!
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

          {/* Main Content */}
          <div className="space-y-8">
            {/* Search Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects, assessments, or milestones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Project Milestones and Assessments */}
            <Card>
              <CardHeader>
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'assessments'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('assessments')}
                    >
                      <Target className="h-4 w-4 inline mr-2" />
                      Assessments
                    </button>
                    <button
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'milestones'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveTab('milestones')}
                    >
                      <BookOpen className="h-4 w-4 inline mr-2" />
                      Project Milestones
                    </button>
                  </nav>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {activeTab === 'assessments' && <AssessmentsTab searchQuery={searchQuery} />}
                {activeTab === 'milestones' && <ProjectMilestonesTab searchQuery={searchQuery} />}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// Assessments Tab Component
function AssessmentsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const { user } = useAuth();

  // Fetch student's assessment submissions
  const { data: submissions = [], isLoading } = useQuery<StudentSubmission[]>({
    queryKey: ["/api/student/assessment-submissions", user?.id],
    queryFn: () => api.getStudentAssessmentSubmissions(user!.id),
    enabled: !!user?.id,
    retry: false,
  });

  // Filter submissions to show only standalone assessments (not linked to any project/milestone)
  const filteredSubmissions = submissions.filter((submission: StudentSubmission) => {
    // Only show assessments that are NOT linked to any project (standalone assessments)
    return !submission.projectTitle;
  });

  // Apply search filter
  const searchFilteredSubmissions = filteredSubmissions.filter((submission: StudentSubmission) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      submission.assessmentTitle?.toLowerCase().includes(query) ||
      (submission.projectTitle && submission.projectTitle.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading assessments...</span>
      </div>
    );
  }

  if (searchFilteredSubmissions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No Matching Assessments' : 'No Available Assessments'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? `No assessments found matching "${searchQuery}".`
                : "You don't have any standalone assessments available yet."
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {searchFilteredSubmissions.map((submission) => (
        <AssessmentSubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}

// Helper functions for search filtering
const matchesSearch = (text: string, query: string): boolean => 
  text.toLowerCase().includes(query);

const assessmentMatches = (assessment: MilestoneAssessment, query: string): boolean =>
  matchesSearch(assessment.title, query) ||
  matchesSearch(assessment.description ?? "", query);

const milestoneMatches = (milestone: ProjectMilestoneWithAssessments, query: string): boolean =>
  matchesSearch(milestone.title, query) ||
  matchesSearch(milestone.description ?? "", query) ||
  (milestone.assessments ?? []).some((assessment) => assessmentMatches(assessment, query));

// Project Milestones Tab Component
function ProjectMilestonesTab({ searchQuery = '' }: { searchQuery?: string }) {
  const { user } = useAuth();

  // Fetch student's projects
  const { data: projects = [], isLoading } = useQuery<StudentProject[]>({
    queryKey: ["/api/projects"],
    queryFn: api.getProjects,
    enabled: !!user?.id && user?.role === 'student',
    retry: false,
  });

  // Fetch student assessment submissions to check completion status
  const { data: studentSubmissions = [] } = useQuery<StudentSubmission[]>({
    queryKey: ["/api/student/assessment-submissions", user?.id],
    enabled: !!user?.id,
    queryFn: () => api.getStudentAssessmentSubmissions(user!.id),
    // Add polling to automatically refresh submissions data every 30 seconds
    // This ensures students see updated completion status when teachers grade their submissions
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: true,
  });

  // Fetch milestones and their assessments for all student projects
  const { data: projectMilestonesWithAssessments = {} } = useQuery<Record<number, ProjectMilestoneWithAssessments[]>>({
    queryKey: ["/api/projects/milestones-with-assessments", projects.map(p => p.id)],
    enabled: !!user?.id && projects.length > 0,
    queryFn: async () => {
      const milestonesData: Record<number, ProjectMilestoneWithAssessments[]> = {};
      for (const project of projects) {
        try {
          const milestones = await api.getMilestones(project.id);
          const milestonesWithStatusAndAssessments = await Promise.all(
            milestones.map(async (milestone) => {
              const milestoneAssessments = await api.getAssessments(milestone.id);
              const milestoneAssessmentIds = new Set(milestoneAssessments.map((assessment) => assessment.id));
              const milestoneSubmissions = studentSubmissions.filter(
                (submission) =>
                  submission.assessmentId != null && milestoneAssessmentIds.has(submission.assessmentId)
              );

              const hasGradedSubmissions = milestoneSubmissions.some((submission) =>
                Boolean((submission.grades && submission.grades.length > 0) || submission.feedback)
              );

              return {
                ...milestone,
                isCompleted: hasGradedSubmissions,
                assessments: milestoneAssessments
              };
            })
          );
          milestonesData[project.id] = milestonesWithStatusAndAssessments;
        } catch (error) {
          milestonesData[project.id] = [];
        }
      }
      return milestonesData;
    },
  });

  // Filter projects to show only active and completed ones
  const eligibleProjects = projects.filter((project) => 
    project.status === 'active' || project.status === 'completed'
  );

  // Apply search filter
  const searchFilteredProjects = eligibleProjects.filter((project: StudentProject) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const projectMilestonesList = projectMilestonesWithAssessments[project.id] || [];

    return (
      project.title.toLowerCase().includes(query) ||
      (project.description ?? "").toLowerCase().includes(query) ||
      projectMilestonesList.some((milestone) =>
        milestoneMatches(milestone, query)
      )
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading milestones...</span>
      </div>
    );
  }

  if (searchFilteredProjects.length === 0) {
    return (
      <div className="text-center p-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchQuery ? 'No Matching Projects' : 'No Active Projects'}
        </h3>
        <p className="text-gray-600">
          {searchQuery 
            ? `No projects or milestones found matching "${searchQuery}".`
            : "You don't have any active or completed projects with milestones yet."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {searchFilteredProjects.map((project) => (
        <ProjectMilestoneCard 
          key={project.id} 
          project={project} 
          milestones={projectMilestonesWithAssessments[project.id] || []}
          searchQuery={searchQuery}
          studentSubmissions={studentSubmissions}
        />
      ))}
    </div>
  );
}

// Project Milestone Card Component
interface ProjectMilestoneCardProps {
  project: StudentProject;
  milestones?: ProjectMilestoneWithAssessments[];
  searchQuery: string;
  studentSubmissions?: StudentSubmission[];
}

function ProjectMilestoneCard({ project, milestones = [], searchQuery, studentSubmissions = [] }: ProjectMilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getMilestoneStatusBadge = (milestone: ProjectMilestoneWithAssessments) => {
    if (milestone.isCompleted) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (milestone.dueDate && new Date(milestone.dueDate) < new Date()) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
  };

  // Filter milestones based on search query
  const filteredMilestones = milestones.filter((milestone) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return milestoneMatches(milestone, query);
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{project.title}</CardTitle>
              <p className="text-gray-600 text-sm">{project.description}</p>
              <p className="text-xs text-gray-500">
                {milestones.length} milestones
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(project.status ?? "draft")}
            <Button variant="ghost" size="sm">
              {isExpanded ? 'Collapse' : 'View Milestones'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {filteredMilestones.length > 0 ? (
              filteredMilestones.map((milestone, index) => (
                <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Milestone {index + 1}: {milestone.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'No due date'}
                        </div>
                        {milestone.xqRubricLevel && (
                          <div className="flex items-center">
                            <Target className="h-3 w-3 mr-1" />
                            Level: {milestone.xqRubricLevel}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {getMilestoneStatusBadge(milestone)}
                    </div>
                  </div>

                  {milestone.deliverables && milestone.deliverables.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Deliverables:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {milestone.deliverables.map((deliverable, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {deliverable}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {milestone.assessments && milestone.assessments.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Assessments:</h5>
                      <div className="space-y-3">
                        {milestone.assessments.map((assessment, idx) => (
                          <AssessmentCard 
                            key={assessment.id} 
                            assessment={assessment} 
                            milestone={milestone}
                            studentSubmissions={studentSubmissions}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center p-6 text-gray-500">
                {searchQuery ? (
                  <p>No milestones found matching "{searchQuery}" in this project.</p>
                ) : (
                  <p>No milestones available for this project.</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface AssessmentCardProps {
  assessment: MilestoneAssessment;
  milestone: ProjectMilestoneWithAssessments;
  studentSubmissions?: StudentSubmission[];
}

// Assessment Card Component for Project Milestones
function AssessmentCard({ assessment, milestone, studentSubmissions = [] }: AssessmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [, setLocation] = useLocation();

  // Find submission for this assessment
  const submission = studentSubmissions.find((sub) =>
    sub.assessmentId === assessment.id
  );



  const getStatusBadge = (submission: StudentSubmission | undefined) => {
    if (!submission) {
      return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
    }
    // Check if graded (has grades or explicit graded status)
    if (submission.status === 'graded' || (submission.questionGrades && Object.keys(submission.questionGrades).length > 0)) {
      return <Badge className="bg-green-100 text-green-800">Graded</Badge>;
    }
    // Check if submitted (has submittedAt timestamp)
    if (submission.submittedAt) {
      return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
    }
    // Otherwise it's a draft
    return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const handleViewAssessment = () => {
    if (submission) {
      // If there's a submission, expand to show details instead of navigating
      setIsExpanded(!isExpanded);
    } else {
      // If no submission, navigate to take the assessment
      setLocation(`/student/assessments/${assessment.id}`);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h6 className="font-medium text-gray-900 mb-1">{assessment.title}</h6>
          <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
          <div className="flex items-center text-xs text-gray-500 space-x-4">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Due: {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'No due date'}
            </div>
            {assessment.xqRubricLevel && (
              <div className="flex items-center">
                <Target className="h-3 w-3 mr-1" />
                Level: {assessment.xqRubricLevel}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          {getStatusBadge(submission)}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewAssessment}
          >
            {submission ? (isExpanded ? 'Hide Details' : 'View Details') : 'Take Assessment'}
          </Button>
        </div>
      </div>

      {isExpanded && submission && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          {/* Submission Info */}
          <div className="mb-3">
            <h6 className="text-sm font-medium text-gray-700 mb-2">Submission Details</h6>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Not submitted yet'}</p>
            </div>
          </div>

          {/* Earned Credentials - Only show for graded assessments */}
          {submission.status === 'graded' && 
           submission.earnedCredentials && 
           submission.earnedCredentials.length > 0 && (
            <div className="mb-3">
              <h6 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                Stickers & Credentials Earned
              </h6>
              <div className="flex flex-wrap gap-2">
                {submission.earnedCredentials.map((credential) => (
                  <div key={credential.id} className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
                    {credential.type === 'sticker' && <Star className="h-3 w-3 text-yellow-500" />}
                    {credential.type === 'badge' && <Award className="h-3 w-3 text-blue-500" />}
                    {credential.type === 'plaque' && <Trophy className="h-3 w-3 text-purple-500" />}
                    <span className="text-xs font-medium">{credential.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions and Responses */}
          {submission.questions && submission.questions.length > 0 && (
            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">Questions & Your Responses</h6>
              <div className="space-y-2">
                {submission.questions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 p-2 rounded text-xs">
                    <p className="font-medium text-gray-900 mb-1">
                      Q{index + 1}: {question.text}
                    </p>
                    <p className="text-gray-600">
                      {(() => {
                        if (Array.isArray(submission.responses)) {
                          const response = submission.responses.find(r => r.questionId === question.id);
                          return response?.answer || "No answer provided";
                        } else if (submission.responses && typeof submission.responses === 'object') {
                          return submission.responses[question.id] || "No answer provided";
                        }
                        return "No answer provided";
                      })()}
                    </p>
                    {submission.status === 'graded' && submission.grades && submission.grades.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <h6 className="text-xs font-medium text-gray-700">Component Skill Results:</h6>
                        {submission.grades.map((grade) => {
                          // Get rubric level color based on level
                          const getRubricLevelColor = (level: string) => {
                            switch (level?.toLowerCase()) {
                              case 'applying': return 'bg-green-100 text-green-800 border-green-200';
                              case 'proficient': return 'bg-blue-100 text-blue-800 border-blue-200';
                              case 'developing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                              case 'emerging': return 'bg-orange-100 text-orange-800 border-orange-200';
                              default: return 'bg-gray-100 text-gray-800 border-gray-200';
                            }
                          };

                          return (
                            <div key={grade.id} className="bg-white border border-gray-200 rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-gray-900">
                                    {grade.componentSkillName || 'Component Skill'}
                                  </span>
                                  <Badge 
                                    className={`capitalize px-1 py-0.5 text-xs font-medium border ${getRubricLevelColor(grade.rubricLevel ?? "")}`}
                                  >
                                    {grade.rubricLevel
                                      ? `${grade.rubricLevel.charAt(0).toUpperCase()}${grade.rubricLevel.slice(1)} ⭐`
                                      : 'Unrated'}
                                  </Badge>
                                </div>
                                <div className="text-xs font-bold text-gray-900">
                                  Score: {Number(grade.score ?? 0) || 0}/4
                                </div>
                              </div>
                              {grade.feedback && (
                                <div className="bg-blue-50 border border-blue-100 rounded p-2 mt-2">
                                  <p className="text-xs font-medium text-blue-900 mb-1">Teacher Feedback:</p>
                                  <p className="text-xs text-blue-900 whitespace-pre-wrap leading-relaxed">
                                    {grade.feedback}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Assessment Submission Card Component
function AssessmentSubmissionCard({ submission }: { submission: StudentSubmission }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (submission: StudentSubmission) => {
    // Check if graded (has grades or explicit graded status)
    if (submission.status === 'graded' || 
        (submission.grades && submission.grades.length > 0) ||
        submission.feedback) {
      return <Badge className="bg-green-100 text-green-800">Graded</Badge>;
    }
    // Check if submitted (has submittedAt timestamp)
    if (submission.submittedAt) {
      return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
    }
    // Otherwise it's a draft
    return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const isGraded = submission.status === 'graded' || 
                  (submission.grades && submission.grades.length > 0) ||
                  submission.feedback;

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
                Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Not submitted yet'}
              </p>
              {/* Show feedback preview */}
              {isGraded && submission.feedback && (
                <div className="mt-2">
                  <span className="text-xs text-blue-600">
                    ✓ Teacher Feedback Available
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(submission)}
            <Button variant="ghost" size="sm">
              {isExpanded ? 'Collapse' : 'View Details'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-6">
            {/* Questions and Responses */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Questions & Your Responses</h4>
              <div className="space-y-4">
                {(submission.questions ?? []).map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 mb-2">
                        Question {index + 1}: {question.text}
                      </h5>
                      {question.type === 'multiple-choice' && Array.isArray(question.options) && (
                        <p className="text-sm text-gray-600">
                          Options: {question.options.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
                      <p className="text-gray-900">
                        {(() => {
                          // Handle both array format (new) and object format (legacy)
                          if (Array.isArray(submission.responses)) {
                            const response = submission.responses.find((response) => response.questionId === question.id);
                            return response?.answer || "No answer provided";
                          } else if (submission.responses && typeof submission.responses === 'object') {
                            return submission.responses[question.id] || "No answer provided";
                          }
                          return "No answer provided";
                        })()}
                      </p>
                    </div>

                    
                  </div>
                ))}
              </div>
            </div>

            {/* Component Skill Results - Show once per submission */}
            {isGraded && submission.grades && submission.grades.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Component Skill Results
                </h4>
                <div className="space-y-4">
                  {submission.grades.map((grade) => {
                    // Get rubric level color based on level
                    const getRubricLevelColor = (level: string) => {
                      switch (level?.toLowerCase()) {
                        case 'applying': return 'bg-green-100 text-green-800 border-green-200';
                        case 'proficient': return 'bg-blue-100 text-blue-800 border-blue-200';
                        case 'developing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                        case 'emerging': return 'bg-orange-100 text-orange-800 border-orange-200';
                        default: return 'bg-gray-100 text-gray-800 border-gray-200';
                      }
                    };

                    return (
                      <div key={grade.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h6 className="font-medium text-gray-900">
                              {grade.componentSkillName || 'Component Skill'}
                            </h6>
                            {grade.rubricLevel && (
                              <Badge 
                                className={`capitalize px-2 py-1 text-xs font-medium border ${getRubricLevelColor(grade.rubricLevel ?? "")}`}
                              >
                                {grade.rubricLevel
                                  ? `${grade.rubricLevel.charAt(0).toUpperCase()}${grade.rubricLevel.slice(1)} ⭐`
                                  : 'Unrated'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-lg font-semibold text-gray-900">
                            Score: {Number(grade.score ?? 0) || 0}/4
                          </div>
                        </div>
                        {grade.feedback && (
                          <div className="bg-blue-50 border border-blue-100 rounded p-3">
                            <p className="text-sm font-medium text-blue-900 mb-1">Teacher Feedback:</p>
                            <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                              {grade.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
