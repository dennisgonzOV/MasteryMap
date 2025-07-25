import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import CreateAssessmentModal from "@/components/modals/create-assessment-modal";
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
  MoreVertical,
  Calendar,
  Download // Added Download icon
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
  const [, setLocation] = useLocation();
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [selectedMilestone, setSelectedMilestone] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
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
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && user?.role === 'teacher',
    retry: false,
  });

  // Fetch all assessments (including milestone-linked ones)
  const { data: assessments = [], refetch: refetchAssessments } = useQuery({
    queryKey: ["/api/assessments"],
    enabled: isAuthenticated && user?.role === 'teacher',
    retry: false,
  });

  // Fetch milestones for filtered project
  const selectedProjectId = projectFilter !== "all" ? parseInt(projectFilter) : null;
  const { data: milestones = [] } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "milestones"],
    queryFn: () => selectedProjectId ? api.getMilestones(selectedProjectId) : Promise.resolve([]),
    enabled: isAuthenticated && user?.role === 'teacher' && !!selectedProjectId,
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

    // Filter by project if a specific filter is selected
    if (projectFilter !== "all") {
      if (projectFilter === "standalone") {
        // Show only standalone assessments (those without milestoneId)
        return !assessment.milestoneId;
      } else {
        const filterProjectId = parseInt(projectFilter);

        // For milestone-linked assessments, check if milestone belongs to selected project
        if (assessment.milestoneId) {
          const milestone = milestones.find((m: any) => m.id === assessment.milestoneId);
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

  const totalAssessments = assessments.length;
  const pendingGrading = 13; // Mock data for now - would come from submissions API
  const aiGeneratedCount = assessments.filter(a => a.aiGenerated).length;

  // Handler functions
  const handleShareAssessment = async (assessmentId: number) => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/generate-share-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate share code');
      }

      const data = await response.json();
      const shareCode = data.shareCode;

      await navigator.clipboard.writeText(shareCode);
      toast({
        title: "Share code copied!",
        description: `Students can enter this code: ${shareCode}`,
      });
    } catch (err) {
      toast({
        title: "Failed to generate share code",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewSubmissions = (assessmentId: number) => {
    setSelectedAssessmentForSubmissions(assessmentId);
    setShowSubmissionsModal(true);
  };

  // Function to trigger the download of assessment results in CSV format
  const handleExportResults = async (assessmentId: number, assessmentTitle: string) => {
    try {
      // Replace this with actual API call to fetch results for the assessment
      const response = await fetch(`/api/assessments/${assessmentId}/results`);

      if (!response.ok) {
        throw new Error(`Failed to fetch assessment results: ${response.status}`);
      }

      const results = await response.json();

      // Convert assessment results to CSV format
      const csvData = convertToCSV(results);

      // Create a Blob object from the CSV data
      const blob = new Blob([csvData], { type: 'text/csv' });

      // Create a temporary URL for the Blob object
      const url = window.URL.createObjectURL(blob);

      // Create a link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${assessmentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv`); // Sanitize filename
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Clean up by removing the temporary link and URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Assessment results exported",
        description: "The assessment results have been successfully exported in CSV format.",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export assessment results",
        variant: "destructive",
      });
    }
  };

  // Function to convert assessment results to CSV format
  const convertToCSV = (results: any[]) => {
    if (!results || results.length === 0) {
      return ''; // Return empty string if no data
    }

    const headers = Object.keys(results[0]); // Extract headers from the first result
    const csvRows = [];

    // Add headers to CSV
    csvRows.push(headers.join(','));

    // Add data rows to CSV
    for (const result of results) {
      const values = headers.map(header => {
        const value = result[header];
        return `"${value ? value.toString().replace(/"/g, '""') : ''}"`; // Escape double quotes
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Modern Header with Stats */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Assessments
                </h1>
                <p className="text-lg text-gray-600">
                  Create and manage competency-based assessments for your projects
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Pending Grading</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingGrading}</p>
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
            <div className="space-y-6">
              {filteredAssessments.map((assessment) => (
                <Card key={assessment.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assessment.title}
                          </h3>
                          {assessment.milestoneId && (
                            <Badge variant="outline" className="flex items-center space-x-1 bg-green-50 text-green-700 border-green-200">
                              <Calendar className="h-3 w-3" />
                              <span>Milestone-Linked</span>
                            </Badge>
                          )}
                          {!assessment.milestoneId && (
                            <Badge variant="outline" className="flex items-center space-x-1 bg-blue-50 text-blue-700 border-blue-200">
                              <Target className="h-3 w-3" />
                              <span>Standalone</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3 text-sm leading-relaxed">{assessment.description}</p>

                        {/* Competencies and Component Skills Display */}
                        {getCompetencyInfo(assessment) && (
                          <div className="mb-4">
                            <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                              <Target className="h-3 w-3 mr-1 text-blue-600" />
                              Competencies Being Tested
                            </h4>
                            <div className="space-y-2">
                              {getCompetencyInfo(assessment).map((competency: any, index: number) => (
                                <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-blue-900 text-sm mb-1">
                                        {competency.competencyName}
                                      </h5>
                                      <p className="text-xs text-blue-700">
                                        {competency.learnerOutcomeName}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-blue-800 mb-1">Component Skills:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {competency.skills.map((skill: any) => (
                                        <Badge key={skill.id} className="text-xs bg-blue-600 text-white hover:bg-blue-700">
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

                        {/* Assessment Info Footer */}
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-orange-500" />
                                <span>Due: {assessment.dueDate ? format(new Date(assessment.dueDate), 'MMM d, yyyy') : 'No due date'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FileText className="h-3 w-3 text-blue-500" />
                                <span>{assessment.questions?.length || 0} questions</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3 text-green-500" />
                                <span>24 submissions</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs">
                                6 pending
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Created {assessment.createdAt ? format(new Date(assessment.createdAt), 'MMM d, yyyy') : 'recently'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col items-end space-y-1 ml-4">
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 text-xs px-2 py-1"
                            onClick={() => handleShareAssessment(assessment.id)}
                          >
                            <Share className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                          <Button 
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50 text-xs px-2 py-1"
                            onClick={() => handleExportResults(assessment.id, assessment.title)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50 text-xs px-2 py-1"
                            onClick={() => setLocation(`/teacher/assessments/${assessment.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700 text-xs px-2 py-1"
                            onClick={() => setLocation(`/teacher/assessments/${assessment.id}/submissions`)}
                          >
                            Grade
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="text-xs px-2 py-1">
                                <MoreVertical className="h-3 w-3" />
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

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Grading Progress</span>
                        <span className="text-sm font-medium text-gray-900">67%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
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