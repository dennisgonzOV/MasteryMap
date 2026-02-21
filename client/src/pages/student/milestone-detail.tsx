import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { api } from "@/lib/api";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Calendar, 
  Target, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ClipboardList,
  Upload,
  FolderOpen,
  ExternalLink
} from "lucide-react";
import type { AssessmentDTO, MilestoneDTO, ProjectDTO, SubmissionWithAssessmentDTO } from "@shared/contracts/api";
import type { PortfolioArtifactDTO } from "@shared/contracts/api";

type MilestoneDetailDTO = MilestoneDTO & {
  deliverableUrl?: string | null;
  deliverableFileName?: string | null;
  deliverableDescription?: string | null;
  includeInPortfolio?: boolean | null;
  status?: string | null;
};

type DeliverableArtifact = PortfolioArtifactDTO;

export default function StudentMilestoneDetail({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const milestoneId = parseInt(params.id);

  const [deliverableDescription, setDeliverableDescription] = useState("");
  const [includeInPortfolio, setIncludeInPortfolio] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingDeliverableId, setEditingDeliverableId] = useState<number | null>(null);
  
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deliverableMutation = useMutation({
    mutationFn: async (data: { 
      deliverableId?: number;
      deliverableUrl: string; 
      deliverableFileName: string; 
      deliverableDescription: string; 
      includeInPortfolio: boolean 
    }) => {
      return api.updateMilestoneDeliverable(milestoneId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones", milestoneId] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/artifacts", user?.id] });
      toast({
        title: "Deliverable saved",
        description: includeInPortfolio 
          ? "Your deliverable has been saved and added to your portfolio." 
          : "Your deliverable has been saved.",
      });
      setSelectedFile(null);
      setEditingDeliverableId(null);
      setDeliverableDescription("");
      setIncludeInPortfolio(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleReplaceDeliverable = (artifact: DeliverableArtifact) => {
    setEditingDeliverableId(artifact.id);
    setDeliverableDescription(artifact.description || "");
    setIncludeInPortfolio(Boolean(artifact.isPublic));
    setSelectedFile(null);
  };

  const handleAddNewDeliverable = () => {
    setEditingDeliverableId(null);
    setDeliverableDescription("");
    setIncludeInPortfolio(false);
    setSelectedFile(null);
  };

  const handleSubmitDeliverable = async () => {
    let deliverableUrl = activeDeliverable?.artifactUrl || "";
    let deliverableFileName = activeDeliverable?.title || "deliverable";

    if (hasLegacyDeliverable) {
      deliverableUrl = milestone?.deliverableUrl ?? "";
      deliverableFileName = milestone?.deliverableFileName ?? "deliverable";
    }

    if (selectedFile) {
      const uploadResponse = await uploadFile(selectedFile);
      if (!uploadResponse) {
        return;
      }
      deliverableUrl = uploadResponse.objectPath;
      deliverableFileName = selectedFile.name;
    }

    if (!deliverableUrl) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    deliverableMutation.mutate({
      deliverableId: activeDeliverable?.id,
      deliverableUrl,
      deliverableFileName,
      deliverableDescription,
      includeInPortfolio,
    });
  };

  // Fetch milestone details
  const { data: milestone, isLoading: milestoneLoading } = useQuery<MilestoneDetailDTO>({
    queryKey: ["/api/milestones", milestoneId],
    enabled: isAuthenticated && !isNaN(milestoneId),
    queryFn: () => api.getMilestone(milestoneId),
  });

  // Fetch assessments for this milestone
  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery<AssessmentDTO[]>({
    queryKey: ["/api/milestones", milestoneId, "assessments"],
    enabled: isAuthenticated && !isNaN(milestoneId),
    queryFn: () => api.getAssessments(milestoneId),
  });

  // Fetch student submissions to check completion status
  const { data: studentSubmissions = [] } = useQuery<SubmissionWithAssessmentDTO[]>({
    queryKey: ["/api/submissions/student"],
    enabled: isAuthenticated,
    queryFn: api.getStudentSubmissions,
  });

  const { data: portfolioArtifacts = [] } = useQuery<DeliverableArtifact[]>({
    queryKey: ["/api/portfolio/artifacts", user?.id],
    enabled: isAuthenticated && user?.role === "student" && !!user?.id,
    queryFn: api.getPortfolioArtifacts,
  });

  // Fetch project details if milestone has a project
  const { data: project } = useQuery<ProjectDTO>({
    queryKey: ["/api/projects", milestone?.projectId],
    enabled: isAuthenticated && Boolean(milestone?.projectId),
    queryFn: () => api.getProject(milestone!.projectId as number),
  });

  const milestoneDeliverables = useMemo(
    () => portfolioArtifacts.filter((artifact) => artifact.milestoneId === milestone?.id),
    [portfolioArtifacts, milestone?.id],
  );

  const activeDeliverable = useMemo(
    () => milestoneDeliverables.find((artifact) => artifact.id === editingDeliverableId),
    [milestoneDeliverables, editingDeliverableId],
  );

  const hasLegacyDeliverable = Boolean(milestone?.deliverableUrl && milestoneDeliverables.length === 0);

  useEffect(() => {
    if (!milestone || editingDeliverableId !== null) {
      return;
    }
    setDeliverableDescription("");
    setIncludeInPortfolio(false);
  }, [editingDeliverableId, milestone?.id]);

  if (isLoading || milestoneLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading milestone...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'student') {
    return null;
  }

  if (!milestone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Navigation />
        <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Milestone Not Found</h1>
            <p className="text-gray-600 mb-6">The milestone you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => setLocation('/student/projects')}>
              Back to Projects
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isOverdue = milestone.dueDate && new Date(milestone.dueDate) < new Date();
  const isCompleted = milestone.status === 'completed';
  const hasRequiredAssessments = !assessmentsLoading && assessments.length > 0;
  
  // Check if student has submitted any assessments for this milestone
  const hasSubmissions = studentSubmissions.some(submission => {
    return submission.assessment?.milestoneId === milestone.id;
  });
  
  const displayStatus = hasSubmissions ? 'submitted' : (isCompleted ? 'completed' : 'not_started');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (project) {
                    setLocation(`/student/projects/${project.id}`);
                  } else {
                    setLocation('/student/projects');
                  }
                }}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to {project ? 'Project' : 'Projects'}</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{milestone.title}</h1>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge 
                    className={
                      displayStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      displayStatus === 'submitted' ? 'bg-blue-100 text-blue-800' :
                      isOverdue ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }
                  >
                    {displayStatus === 'completed' ? 'Completed' : 
                     displayStatus === 'submitted' ? 'Submitted' :
                     isOverdue ? 'Overdue' : 'In Progress'}
                  </Badge>
                  {milestone.dueDate && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Due {format(new Date(milestone.dueDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Context */}
          {project && (
            <Card className="apple-shadow border-0 mb-8">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Part of Project</p>
                    <p className="text-sm text-blue-600">{project.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestone Details */}
          <Card className="apple-shadow border-0 mb-8">
            <CardHeader>
              <CardTitle>Milestone Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{milestone.description}</p>
            </CardContent>
          </Card>

          {/* Status Alert */}
          {isOverdue && displayStatus !== 'completed' && displayStatus !== 'submitted' && (
            <Card className="apple-shadow border-0 border-l-4 border-l-red-500 mb-8">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">This milestone is overdue</p>
                    <p className="text-sm text-red-700">
                      {hasRequiredAssessments
                        ? "Please complete the required assessments as soon as possible."
                        : "No assessments are assigned yet. You can still submit your deliverable below."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {displayStatus === 'completed' && (
            <Card className="apple-shadow border-0 border-l-4 border-l-green-500 mb-8">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Milestone completed!</p>
                    <p className="text-sm text-green-700">Great job completing this milestone. You can review your submissions below.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {displayStatus === 'submitted' && (
            <Card className="apple-shadow border-0 border-l-4 border-l-blue-500 mb-8">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Assessment submitted!</p>
                    <p className="text-sm text-blue-700">Your submission has been received and is awaiting grading. You can review your responses below.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessments Section */}
          <Card className="apple-shadow border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="h-5 w-5" />
                <span>Required Assessments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading assessments...</span>
                </div>
              ) : assessments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No assessments have been assigned for this milestone yet.</p>
                  <p className="text-sm text-gray-500 mt-2">Check back later or contact your teacher for more information.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div 
                      key={assessment.id}
                      className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{assessment.title}</h3>
                          <div className="flex items-center space-x-2">
                            {assessment.dueDate && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                new Date(assessment.dueDate) < new Date() ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                Due {format(new Date(assessment.dueDate), 'MMM d')}
                              </span>
                            )}
                            {(() => {
                              const hasSubmission = studentSubmissions.some((sub) => sub.assessmentId === assessment.id);
                              return (
                                <Button
                                  size="sm"
                                  variant={hasSubmission ? 'outline' : 'default'}
                                  onClick={() => setLocation(`/student/assessments/${assessment.id}`)}
                                  className={hasSubmission ? 'text-blue-600 border-blue-600' : 'bg-blue-600 hover:bg-blue-700'}
                                  data-testid={`button-assessment-${assessment.id}`}
                                >
                                  {hasSubmission ? 'View Submission' : 'Start Assessment'}
                                </Button>
                              );
                            })()}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{assessment.description}</p>
                        {Array.isArray(assessment.questions) && (
                          <p className="text-xs text-gray-500 mt-2">
                            {assessment.questions.length} questions
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deliverable Upload Section */}
          <Card className="apple-shadow border-0 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Submit Deliverable</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {milestoneDeliverables.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">Submitted Files</p>
                  {milestoneDeliverables.map((artifact) => (
                    <div key={artifact.id} className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-2 text-sm text-green-800">
                          <FolderOpen className="h-4 w-4" />
                          <span className="font-medium">{artifact.title || "File uploaded"}</span>
                          {artifact.artifactUrl && (
                            <a
                              href={artifact.artifactUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4 ml-1" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={artifact.isPublic ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}>
                            {artifact.isPublic ? "Public" : "Private"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReplaceDeliverable(artifact)}
                          >
                            Replace
                          </Button>
                        </div>
                      </div>
                      {artifact.description && (
                        <p className="text-sm text-green-700 mt-2">{artifact.description}</p>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddNewDeliverable}
                  >
                    Add Another File
                  </Button>
                </div>
              ) : hasLegacyDeliverable ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Deliverable Submitted</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-green-700">
                    <FolderOpen className="h-4 w-4" />
                    <span>{milestone.deliverableFileName || "File uploaded"}</span>
                    <a
                      href={milestone.deliverableUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </div>
                  {milestone.deliverableDescription && (
                    <p className="text-sm text-green-700 mt-2">{milestone.deliverableDescription}</p>
                  )}
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload" className="text-sm font-medium text-gray-700">
                    {editingDeliverableId ? "Replace selected file (optional)" : "Upload your work"}
                  </Label>
                  <div className="mt-2 flex items-center space-x-4">
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-file-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                      data-testid="button-select-file"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {selectedFile ? "Change File" : editingDeliverableId ? "Select Replacement" : "Select File"}
                    </Button>
                    {selectedFile && (
                      <span className="text-sm text-gray-600">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your deliverable..."
                    value={deliverableDescription}
                    onChange={(e) => setDeliverableDescription(e.target.value)}
                    className="mt-2"
                    rows={3}
                    data-testid="textarea-description"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="portfolio"
                    checked={includeInPortfolio}
                    onCheckedChange={(checked) => setIncludeInPortfolio(checked === true)}
                    data-testid="checkbox-include-portfolio"
                  />
                  <Label htmlFor="portfolio" className="text-sm text-gray-700 cursor-pointer">
                    Make this file public in my portfolio
                  </Label>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Uploading...</span>
                    <span className="text-gray-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmitDeliverable}
                disabled={(!selectedFile && !editingDeliverableId && !hasLegacyDeliverable) || isUploading || deliverableMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit-deliverable"
              >
                {isUploading
                  ? 'Uploading...'
                  : deliverableMutation.isPending
                    ? 'Saving...'
                    : editingDeliverableId
                      ? (selectedFile ? "Replace Deliverable" : "Save Changes")
                      : hasLegacyDeliverable
                        ? "Update Deliverable"
                        : "Add Deliverable"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
