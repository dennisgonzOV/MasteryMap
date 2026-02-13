import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import type {
  AssessmentDTO,
  AssessmentSubmissionSummaryDTO,
  ComponentSkillWithDetailsDTO,
  MilestoneDTO,
  ProjectDTO,
} from "@shared/contracts/api";
import Navigation from "@/components/navigation";
import CreateAssessmentModal from "@/components/modals/create-assessment-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Target,
  Clock,
  Users,
  FileText,
  Sparkles,
  Share,
  Eye,
  Copy,
  Trash2,
  MoreVertical,
  Calendar
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface AssessmentSubmissionWithAssessmentId extends AssessmentSubmissionSummaryDTO {
  assessmentId: number;
}

interface CompetencyGroup {
  competencyName: string;
  competencyCategory: string | null;
  learnerOutcomeName: string | null;
  skills: ComponentSkillWithDetailsDTO[];
}

function parseComponentSkillIds(componentSkillIds: unknown): number[] {
  if (Array.isArray(componentSkillIds)) {
    return componentSkillIds.filter((value): value is number => typeof value === "number");
  }

  if (typeof componentSkillIds === "string") {
    try {
      const parsed = JSON.parse(componentSkillIds);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is number => typeof value === "number")
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function isSubmissionGraded(submission: AssessmentSubmissionSummaryDTO): boolean {
  return (
    (submission.grade !== undefined && submission.grade !== null) ||
    (!!submission.grades && submission.grades.length > 0) ||
    !!submission.gradedAt
  );
}

export default function TeacherAssessments() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assessmentScope, setAssessmentScope] = useState<"mine" | "school">("mine");
  const userRole = user?.role;
  const canManageAssessments = userRole === UserRole.TEACHER || userRole === UserRole.ADMIN;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch projects for filter
  const { data: projects = [] } = useQuery<ProjectDTO[]>({
    queryKey: ["/api/projects", assessmentScope],
    queryFn: () => api.getProjects(assessmentScope),
    enabled: isAuthenticated && canManageAssessments,
    retry: false,
  });

  // Fetch all assessments (including milestone-linked ones)
  const { data: assessments = [], refetch: refetchAssessments } = useQuery<AssessmentDTO[]>({
    queryKey: ["/api/assessments", assessmentScope],
    queryFn: () => api.getAllAssessments(assessmentScope),
    enabled: isAuthenticated && canManageAssessments,
    retry: false,
  });

  // Fetch milestones for filtered project or all projects
  const selectedProjectId = projectFilter !== "all" ? parseInt(projectFilter) : null;
  const { data: milestones = [] } = useQuery<MilestoneDTO[]>({
    queryKey: ["/api/projects", selectedProjectId, "milestones"],
    queryFn: async () => {
      if (selectedProjectId) {
        return api.getMilestones(selectedProjectId);
      } else {
        // Fetch milestones for all projects when showing all assessments
        const milestoneGroups = await Promise.all(
          projects.map(async (project) => {
            try {
              return await api.getMilestones(project.id);
            } catch {
              return [] as MilestoneDTO[];
            }
          })
        );
        return milestoneGroups.flat();
      }
    },
    enabled: isAuthenticated && canManageAssessments && (!!selectedProjectId || projects.length > 0),
    retry: false,
  });

  // Fetch component skills with competency details
  const { data: componentSkillsDetails = [] } = useQuery<ComponentSkillWithDetailsDTO[]>({
    queryKey: ["/api/competencies/component-skills/details"],
    queryFn: () => api.getComponentSkillsWithDetails(),
    enabled: isAuthenticated && canManageAssessments,
    retry: false,
  });

  // Fetch all submissions to calculate grading progress
  const { data: allSubmissions = [] } = useQuery<AssessmentSubmissionWithAssessmentId[]>({
    queryKey: ["/api/submissions/all-for-teacher"],
    queryFn: async () => {
      // Fetch submissions for all teacher's assessments
      const submissionsPromises = assessments.map(async (assessment) => {
        try {
          const submissions = await api.getAssessmentSubmissions(assessment.id);
          return submissions.map((submission) => ({ ...submission, assessmentId: assessment.id }));
        } catch {
          return [];
        }
      });

      const allSubmissionsArrays = await Promise.all(submissionsPromises);
      return allSubmissionsArrays.flat();
    },
    enabled: isAuthenticated && canManageAssessments && assessments.length > 0,
    retry: false,
  });

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

  if (!isAuthenticated || !canManageAssessments) {
    return null;
  }

  // Helper function to get competency information for an assessment
  const getCompetencyInfo = (assessment: AssessmentDTO): CompetencyGroup[] => {
    if (!componentSkillsDetails.length) return [];
    const skillIds = parseComponentSkillIds(assessment.componentSkillIds);
    if (!skillIds.length) return [];

    const skills = componentSkillsDetails.filter((skill) => skillIds.includes(skill.id));

    // Group by competency
    const competencyGroups = skills.reduce<Record<number, CompetencyGroup>>((acc, skill) => {
      const key = skill.competencyId;
      if (key == null) {
        return acc;
      }
      if (!acc[key]) {
        acc[key] = {
          competencyName: skill.competencyName ?? skill.name,
          competencyCategory: skill.competencyCategory ?? null,
          learnerOutcomeName: skill.learnerOutcomeName ?? null,
          skills: []
        };
      }
      acc[key].skills.push(skill);
      return acc;
    }, {});

    return Object.values(competencyGroups);
  };

  // Filter assessments
  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (assessment.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by project if a specific filter is selected
    if (projectFilter !== "all") {
      if (projectFilter === "standalone") {
        // Show only standalone assessments (those without milestoneId)
        return !assessment.milestoneId;
      } else {
        const filterProjectId = parseInt(projectFilter);

        // For milestone-linked assessments, check if milestone belongs to selected project
        if (assessment.milestoneId) {
          const milestone = milestones.find((m) => m.id === assessment.milestoneId);
          if (!milestone || milestone.projectId !== filterProjectId) {
            return false;
          }
        } else {
          // For standalone assessments, they don't belong to any project
          // so exclude them when filtering by specific project
          return false;
        }
      }
    }

    return matchesSearch;
  });

  const submissionStatsByAssessment = useMemo(() => {
    const stats = new Map<number, { total: number; graded: number }>();

    for (const submission of allSubmissions) {
      const current = stats.get(submission.assessmentId) ?? { total: 0, graded: 0 };
      current.total += 1;
      if (isSubmissionGraded(submission)) {
        current.graded += 1;
      }
      stats.set(submission.assessmentId, current);
    }

    return stats;
  }, [allSubmissions]);

  const getSubmissionStats = (assessmentId: number) => {
    const stats = submissionStatsByAssessment.get(assessmentId) ?? { total: 0, graded: 0 };
    const pending = Math.max(stats.total - stats.graded, 0);
    const progress = stats.total > 0 ? Math.round((stats.graded / stats.total) * 100) : 0;
    return { ...stats, pending, progress };
  };

  const totalAssessments = assessments.length;
  const aiGeneratedCount = assessments.filter(a => a.aiGenerated).length;

  const canManageAssessment = (assessment: AssessmentDTO): boolean => {
    if (user?.role === UserRole.ADMIN) {
      return true;
    }

    if (assessment.createdBy) {
      return assessment.createdBy === user?.id;
    }

    if (!assessment.milestoneId) {
      return true;
    }

    const milestone = milestones.find((m) => m.id === assessment.milestoneId);
    if (!milestone) {
      return false;
    }

    const project = projects.find((p) => p.id === milestone.projectId);
    return project?.teacherId === user?.id;
  };

  // Handler functions
  const handleCopyShareCode = async (shareCode: string) => {
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

  





  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: (assessmentId: number) => api.deleteAssessment(assessmentId),
    onSuccess: () => {
      toast({
        title: "Assessment deleted",
        description: "Assessment has been successfully deleted.",
      });
      // Invalidate the main assessments query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentScope] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete assessment";
      toast({
        title: "Delete failed", 
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteAssessment = (assessmentId: number, assessmentTitle: string) => {
    if (confirm(`Are you sure you want to delete "${assessmentTitle}"? This action cannot be undone.`)) {
      deleteAssessmentMutation.mutate(assessmentId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Modern Header with Stats */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {assessmentScope === "mine" ? "Assessments" : "School Assessments"}
                </h1>
                <p className="text-lg text-gray-600">
                  {assessmentScope === "mine"
                    ? "Create and manage competency-based assessments for your projects"
                    : "Browse assessments created by teachers in your school"}
                </p>
              </div>
              <Button 
                onClick={() => setShowCreateAssessment(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-xl shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Assessment
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Assessments</p>
                      <p className="text-2xl font-bold text-gray-900">{totalAssessments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">AI Generated</p>
                      <p className="text-2xl font-bold text-gray-900">{aiGeneratedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Milestone-Linked</p>
                      <p className="text-2xl font-bold text-gray-900">{assessments.filter(a => a.milestoneId).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters & Search */}
          <Card className="bg-white border-0 shadow-sm mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:w-64">
                  <Select value={assessmentScope} onValueChange={(value) => setAssessmentScope(value as "mine" | "school")}>
                    <SelectTrigger className="focus-ring">
                      <SelectValue placeholder="Assessment scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine">My Assessments</SelectItem>
                      <SelectItem value="school">All School Assessments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search assessments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 focus-ring"
                    />
                  </div>
                </div>
                <div className="sm:w-64">
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="focus-ring">
                      <SelectValue placeholder="Filter by project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="standalone">Assessments without projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessments List */}
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchQuery || projectFilter !== "all" ? "No assessments match your filters" : "No assessments yet"}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery || projectFilter !== "all" 
                  ? "Try adjusting your search criteria or filters to find what you're looking for."
                  : "Create your first assessment to evaluate student learning and progress."
                }
              </p>
              {(!searchQuery && projectFilter === "all") && (
                <Button 
                  onClick={() => setShowCreateAssessment(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700 btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Assessment
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredAssessments.map((assessment) => {
                const milestone = assessment.milestoneId
                  ? milestones.find((m) => m.id === assessment.milestoneId)
                  : undefined;
                const milestoneNumber = milestone?.order ?? "?";
                const questionCount = Array.isArray(assessment.questions) ? assessment.questions.length : 0;
                const competencyInfo = getCompetencyInfo(assessment);
                const submissionStats = getSubmissionStats(assessment.id);
                const isManageable = canManageAssessment(assessment);

                return (
                  <Card key={assessment.id} className="bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
                    <CardContent className="p-6">
                      {/* Header Section */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {assessment.title}
                            </h3>
                            {assessment.aiGenerated && (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs px-2 py-0.5">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{assessment.description}</p>
                        </div>

                        {/* Type Badge */}
                        <div className="ml-3 flex-shrink-0">
                          {assessment.milestoneId ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Milestone: {milestoneNumber}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              <Target className="h-3 w-3 mr-1" />
                              Standalone
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Key Metrics Row */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center bg-gray-50 rounded-lg py-2 px-3">
                          <div className="flex items-center justify-center mb-1">
                            <FileText className="h-4 w-4 text-blue-500" />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{questionCount}</p>
                          <p className="text-xs text-gray-600">Questions</p>
                        </div>
                        <div className="text-center bg-gray-50 rounded-lg py-2 px-3">
                          <div className="flex items-center justify-center mb-1">
                            <Users className="h-4 w-4 text-green-500" />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{submissionStats.total}</p>
                          <p className="text-xs text-gray-600">Submissions</p>
                        </div>
                        <div className="text-center bg-gray-50 rounded-lg py-2 px-3">
                          <div className="flex items-center justify-center mb-1">
                            <Clock className="h-4 w-4 text-orange-500" />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{submissionStats.pending}</p>
                          <p className="text-xs text-gray-600">Pending</p>
                        </div>
                      </div>

                      {/* Competencies Preview */}
                      {competencyInfo.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Skills Assessment</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {competencyInfo.slice(0, 2).map((competency, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                {competency.competencyName}
                              </Badge>
                            ))}
                            {competencyInfo.length > 2 && (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                                +{competencyInfo.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Share Code - Compact Version */}
                      {assessment.shareCode && (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Share className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Code:</span>
                            <span className="font-mono font-bold text-green-800">{assessment.shareCode}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:bg-green-100 h-8 w-8 p-0"
                            onClick={() => handleCopyShareCode(assessment.shareCode!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Grading Progress</span>
                          <span className="text-sm font-semibold text-gray-900">{submissionStats.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${submissionStats.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer with Due Date and Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>Due: {assessment.dueDate ? format(new Date(assessment.dueDate), "MMM d") : "No due date"}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 h-8 px-2"
                            onClick={() => setLocation(`/teacher/assessments/${assessment.id}`)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>

                          <Button
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700 h-8 px-3 text-xs"
                            disabled={!isManageable}
                            onClick={() => setLocation(`/teacher/assessments/${assessment.id}/submissions`)}
                          >
                            Grade
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 h-8 w-8 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isManageable ? (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteAssessment(assessment.id, assessment.title)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Assessment
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled>
                                  Only creator can manage this assessment
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Show results count */}
          {filteredAssessments.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Showing {filteredAssessments.length} of {assessments.length} assessments
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Assessment Creation Modal */}
      <CreateAssessmentModal
        open={showCreateAssessment}
        onOpenChange={setShowCreateAssessment}
        onAssessmentCreated={(assessmentId) => {
      
          refetchAssessments();
        }}
      />

      
    </div>
  );
}
