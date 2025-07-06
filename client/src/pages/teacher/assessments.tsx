import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import Navigation from "@/components/navigation";
import AssessmentModal from "@/components/modals/assessment-modal";
import StandaloneAssessmentModal from "@/components/modals/standalone-assessment-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Target,
  Clock,
  Users,
  FileText,
  Sparkles,
  BookOpen
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function TeacherAssessments() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [showStandaloneAssessment, setShowStandaloneAssessment] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [selectedMilestone, setSelectedMilestone] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && user?.role === 'teacher',
    retry: false,
  });

  // Fetch milestones for selected project
  const { data: milestones = [] } = useQuery({
    queryKey: ["/api/projects", selectedProject, "milestones"],
    queryFn: () => selectedProject ? api.getMilestones(selectedProject) : Promise.resolve([]),
    enabled: isAuthenticated && user?.role === 'teacher' && !!selectedProject,
    retry: false,
  });

  // Mock assessments data - in real app this would come from API
  const assessments = [
    {
      id: 1,
      title: "Climate Change Research Analysis",
      description: "Assess students' understanding of climate change research methodologies",
      projectId: 1,
      projectTitle: "Sustainable Cities Project",
      milestoneTitle: "Research Phase",
      questionsCount: 5,
      submissionsCount: 18,
      gradedCount: 12,
      aiGenerated: true,
      createdAt: new Date('2024-12-01'),
    },
    {
      id: 2,
      title: "Urban Planning Presentation",
      description: "Evaluate presentation skills and urban planning concepts",
      projectId: 1,
      projectTitle: "Sustainable Cities Project",
      milestoneTitle: "Design Phase",
      questionsCount: 4,
      submissionsCount: 24,
      gradedCount: 24,
      aiGenerated: false,
      createdAt: new Date('2024-11-28'),
    },
    {
      id: 3,
      title: "App Development Reflection",
      description: "Self-assessment on learning during app development",
      projectId: 2,
      projectTitle: "Digital Innovation Lab",
      milestoneTitle: "Development Sprint",
      questionsCount: 6,
      submissionsCount: 15,
      gradedCount: 8,
      aiGenerated: true,
      createdAt: new Date('2024-11-25'),
    },
  ];

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

  if (!isAuthenticated || user?.role !== 'teacher') {
    return null;
  }

  // Filter assessments
  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assessment.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === "all" || assessment.projectId.toString() === projectFilter;
    return matchesSearch && matchesProject;
  });

  const totalAssessments = assessments.length;
  const pendingGrading = assessments.reduce((sum, a) => sum + (a.submissionsCount - a.gradedCount), 0);
  const aiGeneratedCount = assessments.filter(a => a.aiGenerated).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Assessments
              </h1>
              <p className="text-gray-600">
                Create and manage competency-based assessments for your projects.
              </p>
            </div>
          </div>

          {/* Assessment Creation Options */}
          <Card className="apple-shadow border-0 mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Create New Assessment
              </CardTitle>
              <p className="text-sm text-gray-600">
                Create competency-based assessments for your projects.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={() => setShowStandaloneAssessment(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700 btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assessment
                </Button>
                <p className="text-sm text-gray-500">
                  Create assessments that measure XQ competencies through component skills.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                    <p className="text-2xl font-bold text-gray-900">{totalAssessments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Grading</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingGrading}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">AI Generated</p>
                    <p className="text-2xl font-bold text-gray-900">{aiGeneratedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="apple-shadow border-0 mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
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
            <div className="space-y-6">
              {filteredAssessments.map((assessment) => (
                <Card key={assessment.id} className="apple-shadow border-0 card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assessment.title}
                          </h3>
                          {assessment.aiGenerated && (
                            <Badge variant="secondary" className="flex items-center space-x-1">
                              <Sparkles className="h-3 w-3" />
                              <span>AI Generated</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{assessment.description}</p>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{assessment.projectTitle}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-4 w-4" />
                            <span>{assessment.milestoneTitle}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FileText className="h-4 w-4" />
                            <span>{assessment.questionsCount} questions</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{assessment.submissionsCount} submissions</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className="text-sm text-gray-500">
                          {format(assessment.createdAt, 'MMM d, yyyy')}
                        </span>
                        <div className="flex items-center space-x-2">
                          {assessment.gradedCount < assessment.submissionsCount && (
                            <Badge variant="destructive">
                              {assessment.submissionsCount - assessment.gradedCount} pending
                            </Badge>
                          )}
                          <Button 
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Grade Submissions
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Grading Progress</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round((assessment.gradedCount / assessment.submissionsCount) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full progress-bar"
                          style={{ width: `${(assessment.gradedCount / assessment.submissionsCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
      <AssessmentModal
        open={showCreateAssessment}
        onOpenChange={setShowCreateAssessment}
        milestoneId={selectedMilestone}
        onAssessmentCreated={(assessmentId) => {
          console.log('Assessment created:', assessmentId);
        }}
      />

      {/* Standalone Assessment Modal */}
      <StandaloneAssessmentModal
        open={showStandaloneAssessment}
        onOpenChange={setShowStandaloneAssessment}
        onAssessmentCreated={(assessmentId) => {
          console.log('Standalone assessment created:', assessmentId);
        }}
      />
    </div>
  );
}
