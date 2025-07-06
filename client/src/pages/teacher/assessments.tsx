import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import CreateAssessmentModal from "@/components/modals/create-assessment-modal";
import GradingInterface from "@/components/grading-interface";
import ViewSubmissionsModal from "@/components/modals/view-submissions-modal";
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
  BookOpen,
  Share,
  Eye,
  Copy,
  Trash2,
  MoreVertical
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

export default function TeacherAssessments() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [selectedMilestone, setSelectedMilestone] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [showGradingInterface, setShowGradingInterface] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssessmentForSubmissions, setSelectedAssessmentForSubmissions] = useState<number | null>(null);

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

  // Fetch all assessments
  const { data: assessments = [], refetch: refetchAssessments } = useQuery({
    queryKey: ["/api/assessments/standalone"],
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

  // Fetch component skills with competency details
  const { data: componentSkillsDetails = [] } = useQuery({
    queryKey: ["/api/component-skills/details"],
    enabled: isAuthenticated && user?.role === 'teacher',
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

  if (!isAuthenticated || user?.role !== 'teacher') {
    return null;
  }

  // Helper function to get competency information for an assessment
  const getCompetencyInfo = (assessment: any) => {
    if (!assessment.componentSkillIds || !componentSkillsDetails) return null;
    
    const skillIds = Array.isArray(assessment.componentSkillIds) 
      ? assessment.componentSkillIds 
      : JSON.parse(assessment.componentSkillIds || '[]');
    
    const skills = componentSkillsDetails.filter((skill: any) => 
      skillIds.includes(skill.id)
    );
    
    // Group by competency
    const competencyGroups = skills.reduce((acc: any, skill: any) => {
      const key = skill.competencyId;
      if (!acc[key]) {
        acc[key] = {
          competencyName: skill.competencyName,
          competencyCategory: skill.competencyCategory,
          learnerOutcomeName: skill.learnerOutcomeName,
          skills: []
        };
      }
      acc[key].skills.push(skill);
      return acc;
    }, {});
    
    return Object.values(competencyGroups);
  };

  // Filter assessments
  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assessment.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalAssessments = assessments.length;
  const pendingGrading = 13; // Mock data for now - would come from submissions API
  const aiGeneratedCount = assessments.filter(a => a.aiGenerated).length;

  // Handler functions
  const handleShareAssessment = async (assessmentId: number) => {
    const shareUrl = `${window.location.origin}/assessment/${assessmentId}`;
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

  const handleViewSubmissions = (assessmentId: number) => {
    setSelectedAssessmentForSubmissions(assessmentId);
    setShowSubmissionsModal(true);
  };

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: number) => {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete assessment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment deleted",
        description: "Assessment has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments/standalone"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed", 
        description: error.message || "Failed to delete assessment",
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
                  onClick={() => setShowCreateAssessment(true)}
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
                        
                        {/* Competencies and Component Skills Display */}
                        {getCompetencyInfo(assessment) && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                              <Target className="h-4 w-4 mr-2" />
                              Competencies Being Tested
                            </h4>
                            <div className="space-y-2">
                              {getCompetencyInfo(assessment).map((competency: any, index: number) => (
                                <div key={index} className="bg-blue-50 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h5 className="font-medium text-blue-900">
                                        {competency.competencyName}
                                      </h5>
                                      <p className="text-sm text-blue-700">
                                        {competency.learnerOutcomeName}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {competency.competencyCategory}
                                    </Badge>
                                  </div>
                                  <div className="mt-2">
                                    <p className="text-xs text-blue-600 mb-1">Component Skills:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {competency.skills.map((skill: any) => (
                                        <Badge key={skill.id} variant="secondary" className="text-xs">
                                          {skill.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Due: {assessment.dueDate ? format(new Date(assessment.dueDate), 'MMM d, yyyy') : 'No due date'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FileText className="h-4 w-4" />
                            <span>{assessment.questions?.length || 0} questions</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>24 submissions</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-4 w-4" />
                            <span>Standalone Assessment</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className="text-sm text-gray-500">
                          {assessment.createdAt ? format(new Date(assessment.createdAt), 'MMM d, yyyy') : 'Recently created'}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive">
                            6 pending
                          </Badge>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              onClick={() => handleShareAssessment(assessment.id)}
                            >
                              <Share className="h-4 w-4 mr-1" />
                              Share Assessment
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleViewSubmissions(assessment.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Submissions
                            </Button>
                            <Button 
                              size="sm"
                              className="bg-blue-600 text-white hover:bg-blue-700"
                              onClick={() => {
                                setSelectedAssessmentId(assessment.id);
                                setShowGradingInterface(true);
                              }}
                            >
                              Grade Submissions
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDeleteAssessment(assessment.id, assessment.title)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Assessment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Grading Progress</span>
                        <span className="text-sm font-medium text-gray-900">
                          67%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full progress-bar"
                          style={{ width: '67%' }}
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
      <CreateAssessmentModal
        open={showCreateAssessment}
        onOpenChange={setShowCreateAssessment}
        onAssessmentCreated={(assessmentId) => {
          console.log('Assessment created:', assessmentId);
          refetchAssessments();
        }}
      />

      {/* Grading Interface Modal */}
      {selectedAssessmentId && (
        <GradingInterface
          assessmentId={selectedAssessmentId}
          isOpen={showGradingInterface}
          onClose={() => {
            setShowGradingInterface(false);
            setSelectedAssessmentId(null);
          }}
        />
      )}

      {/* View Submissions Modal */}
      {selectedAssessmentForSubmissions && (
        <ViewSubmissionsModal
          isOpen={showSubmissionsModal}
          onClose={() => {
            setShowSubmissionsModal(false);
            setSelectedAssessmentForSubmissions(null);
          }}
          assessmentId={selectedAssessmentForSubmissions}
          assessmentTitle={
            assessments.find((a: any) => a.id === selectedAssessmentForSubmissions)?.title || 'Assessment'
          }
        />
      )}
    </div>
  );
}
