import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ProjectTeamSelectionModal from "./project-team-selection-modal";
import TeamEditModal from "./team-edit-modal";
import {
  Users, 
  Target, 
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Play,
  Sparkles
} from "lucide-react";
import ConfirmationModal from '@/components/ui/confirmation-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  AIAssessmentGeneratedQuestionDTO,
  AssessmentCreateRequestDTO,
  BestStandardDTO,
  ComponentSkillWithDetailsDTO,
  MilestoneDTO,
  ProjectDTO,
  ProjectTeamDTO,
  ProjectUpdateRequestDTO,
} from '@shared/contracts/api';

type QuestionTypeKey = "open-ended" | "multiple-choice" | "short-answer";

const DEFAULT_AI_QUESTION_TYPES: Record<QuestionTypeKey, boolean> = {
  "open-ended": true,
  "multiple-choice": true,
  "short-answer": false,
};

const QUESTION_TYPE_LABELS: Record<QuestionTypeKey, string> = {
  "open-ended": "Open-ended",
  "multiple-choice": "Multiple Choice",
  "short-answer": "Short Answer",
};

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is number => typeof item === "number");
}

interface ProjectManagementModalProps {
  projectId: number;
  isOpen: boolean;
  readOnly?: boolean;
  onClose: () => void;
}

export default function ProjectManagementModal({ projectId, isOpen, readOnly = false, onClose }: ProjectManagementModalProps) {
  const { toast } = useToast();
  const [editingProject, setEditingProject] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    dueDate: ''
  });
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    dueDate: ''
  });
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ProjectTeamDTO | null>(null);
  const [assessmentMilestoneId, setAssessmentMilestoneId] = useState<number | null>(null);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiQuestionTypes, setAiQuestionTypes] = useState<Record<QuestionTypeKey, boolean>>({
    ...DEFAULT_AI_QUESTION_TYPES,
  });
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery<ProjectDTO>({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: () => api.getProject(projectId),
    enabled: isOpen && !!projectId,
  });

  const projectComponentSkillIds = useMemo(
    () => toNumberArray(project?.componentSkillIds),
    [project?.componentSkillIds],
  );
  const projectBestStandardIds = useMemo(
    () => toNumberArray(project?.bestStandardIds),
    [project?.bestStandardIds],
  );

  const { data: projectComponentSkills = [], isLoading: componentSkillsLoading } = useQuery<ComponentSkillWithDetailsDTO[]>({
    queryKey: ["/api/competencies/component-skills/by-ids", projectComponentSkillIds],
    queryFn: () => api.getComponentSkillsByIds(projectComponentSkillIds),
    enabled: isOpen && projectComponentSkillIds.length > 0,
  });

  const { data: projectBestStandards = [], isLoading: bestStandardsLoading } = useQuery<BestStandardDTO[]>({
    queryKey: ["/api/competencies/best-standards/by-ids", projectBestStandardIds],
    queryFn: () => api.getBestStandardsByIds(projectBestStandardIds),
    enabled: isOpen && projectBestStandardIds.length > 0,
  });

  // Fetch project milestones
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery<MilestoneDTO[]>({
    queryKey: [`/api/projects/${projectId}/milestones`],
    queryFn: () => api.getMilestones(projectId),
    enabled: isOpen && !!projectId,
  });

  // Fetch project teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery<ProjectTeamDTO[]>({
    queryKey: [`/api/projects/${projectId}/teams`],
    queryFn: () => api.getProjectTeams(projectId),
    enabled: isOpen && !!projectId,
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: (updates: ProjectUpdateRequestDTO) => api.updateProject(projectId, updates),
    onSuccess: () => {
      toast({ title: "Project updated successfully" });
      setEditingProject(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update project",
        variant: "destructive",
      });
    },
  });

  // Toggle project visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: (isPublic: boolean) => api.toggleProjectVisibility(projectId, isPublic),
    onSuccess: (_, isPublic) => {
      toast({ 
        title: isPublic ? "Project is now public" : "Project is now private",
        description: isPublic ? "Other educators can now discover this project" : "This project is hidden from the community library"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/public"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to update visibility",
        description: error instanceof Error ? error.message : "Failed to update visibility",
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: () => api.deleteProject(projectId),
    onSuccess: () => {
      toast({ title: "Project deleted successfully" });
      setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: unknown) => {
      setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: ({ milestoneId, updates }: { milestoneId: number; updates: Record<string, unknown> }) =>
      api.updateMilestone(milestoneId, updates),
    onSuccess: () => {
      toast({ title: "Milestone updated successfully" });
      setEditingMilestone(null);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update milestone",
        variant: "destructive",
      });
    },
  });

  // Delete milestone mutation
  const deleteMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) => api.deleteMilestone(milestoneId),
    onSuccess: () => {
      toast({ title: "Milestone deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete milestone",
        variant: "destructive",
      });
    },
  });

  // Generate milestones and assessments mutation
  const generateMilestonesAndAssessmentsMutation = useMutation({
    mutationFn: () => api.generateMilestonesAndAssessments(projectId),
    onSuccess: (data) => {
      toast({ 
        title: "Generation successful",
        description: data.message || "Milestones and assessments generated successfully"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments/standalone"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate milestones and assessments",
        variant: "destructive",
      });
    },
  });

  // Start project mutation
  const startProjectMutation = useMutation({
    mutationFn: () => api.startProject(projectId),
    onSuccess: () => {
      toast({ 
        title: "Project started successfully",
        description: "The project is now active and students can begin working on it."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Failed to start project",
        description: error instanceof Error ? error.message : "Failed to start project",
        variant: "destructive",
      });
    },
  });

    // Delete team mutation
    const deleteTeamMutation = useMutation({
      mutationFn: (teamId: number) => api.deleteProjectTeam(teamId),
      onSuccess: () => {
        toast({ title: "Team deleted successfully" });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/teams`] });
      },
      onError: (error: unknown) => {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Failed to delete team",
          variant: "destructive",
        });
      },
    });

  const selectedMilestone = milestones.find((milestone) => milestone.id === assessmentMilestoneId) ?? null;
  const hasSelectedQuestionType = Object.values(aiQuestionTypes).some(Boolean);
  const projectHasBestStandards = projectBestStandardIds.length > 0;

  const createMilestoneAssessmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMilestone) {
        throw new Error("Please select a milestone first");
      }

      if (projectComponentSkills.length === 0) {
        throw new Error("This project has no competency skills. Add skills to the project before generating assessments.");
      }

      if (projectHasBestStandards && projectBestStandards.length === 0) {
        throw new Error("Unable to load project B.E.S.T. standards. Please try again.");
      }

      const selectedQuestionTypes = (Object.entries(aiQuestionTypes) as Array<[QuestionTypeKey, boolean]>)
        .filter(([, checked]) => checked)
        .map(([type]) => type);

      if (selectedQuestionTypes.length === 0) {
        throw new Error("Select at least one question type");
      }

      const milestoneDueDate = selectedMilestone.dueDate
        ? new Date(selectedMilestone.dueDate).toISOString()
        : new Date().toISOString();

      const aiAssessment = await api.generateAssessmentFromSkills({
        milestoneTitle: selectedMilestone.title,
        milestoneDescription: selectedMilestone.description || "",
        milestoneDueDate,
        componentSkills: projectComponentSkills,
        bestStandards: projectBestStandards,
        questionCount: aiQuestionCount,
        questionTypes: selectedQuestionTypes,
      });

      const questions = Array.isArray(aiAssessment.questions)
        ? aiAssessment.questions
          .map((question: AIAssessmentGeneratedQuestionDTO, index) => ({
            id: question.id || `q${index + 1}`,
            text: question.text,
            type: question.type,
            rubricCriteria: question.rubricCriteria || "",
            options: question.choices || [],
            correctAnswer: question.correctAnswer || question.sampleAnswer || "",
          }))
          .filter((question) => question.text.trim().length > 0)
        : [];

      if (questions.length === 0) {
        throw new Error("AI could not generate valid questions for this milestone");
      }

      const payload: AssessmentCreateRequestDTO = {
        milestoneId: selectedMilestone.id,
        title: aiAssessment.title || `${selectedMilestone.title} Assessment`,
        description: aiAssessment.description || `Assessment for ${selectedMilestone.title}`,
        dueDate: selectedMilestone.dueDate || undefined,
        componentSkillIds: projectComponentSkillIds,
        questions,
        aiGenerated: true,
        assessmentType: "teacher",
      };

      return api.createAssessment(payload);
    },
    onSuccess: () => {
      toast({
        title: "Assessment created",
        description: "AI assessment was generated and attached to the selected milestone.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      if (selectedMilestone?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/milestones", selectedMilestone.id, "assessments"] });
      }
      setAssessmentMilestoneId(null);
      setAiQuestionCount(5);
      setAiQuestionTypes({ ...DEFAULT_AI_QUESTION_TYPES });
    },
    onError: (error: unknown) => {
      toast({
        title: "Assessment generation failed",
        description: error instanceof Error ? error.message : "Failed to create AI assessment",
        variant: "destructive",
      });
    },
  });

  const handleEditProject = () => {
    if (project) {
      setProjectForm({
        title: project.title,
        description: project.description ?? '',
        dueDate: project.dueDate ? format(new Date(project.dueDate), 'yyyy-MM-dd') : ''
      });
      setEditingProject(true);
    }
  };

  const handleSaveProject = () => {
    // Validate that project due date is not in the past
    if (projectForm.dueDate) {
      const projectDate = new Date(projectForm.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (projectDate < today) {
        toast({
          title: "Invalid due date",
          description: "Project due date cannot be in the past",
          variant: "destructive",
        });
        return;
      }

      // Validate that project due date is after all milestone due dates
      if (milestones.length > 0) {
        const latestMilestone = milestones
          .filter((m): m is MilestoneDTO & { dueDate: Date | string } => m.dueDate != null)
          .reduce((latest, milestone) => {
            const milestoneDate = new Date(milestone.dueDate);
            return milestoneDate > latest ? milestoneDate : latest;
          }, new Date(0));

        if (latestMilestone.getTime() > 0 && projectDate <= latestMilestone) {
          toast({
            title: "Invalid due date",
            description: "Project due date must be after all milestone due dates",
            variant: "destructive",
          });
          return;
        }
      }
    }

    updateProjectMutation.mutate({
      title: projectForm.title,
      description: projectForm.description,
      dueDate: projectForm.dueDate || null,
    });
  };

  const handleEditMilestone = (milestone: MilestoneDTO) => {
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description ?? '',
      dueDate: milestone.dueDate ? format(new Date(milestone.dueDate), 'yyyy-MM-dd') : ''
    });
    setEditingMilestone(milestone.id);
  };

  const handleSaveMilestone = (milestoneId: number) => {
    // Validate that milestone due date is not in the past
    if (milestoneForm.dueDate) {
      const milestoneDate = new Date(milestoneForm.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (milestoneDate < today) {
        toast({
          title: "Invalid due date",
          description: "Milestone due date cannot be in the past",
          variant: "destructive",
        });
        return;
      }

      // Validate that milestone due date is before project due date
      if (project?.dueDate) {
        const projectDate = new Date(project.dueDate);
        
        if (milestoneDate >= projectDate) {
          toast({
            title: "Invalid due date",
            description: "Milestone due date must be before the project due date",
            variant: "destructive",
          });
          return;
        }
      }
    }

    updateMilestoneMutation.mutate({
      milestoneId,
      updates: {
        title: milestoneForm.title,
        description: milestoneForm.description,
        dueDate: milestoneForm.dueDate || null,
      }
    });
  };

  const handleDeleteProject = () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Project',
      description: `Are you sure you want to delete "${project?.title}"? This will also delete all milestones. This action cannot be undone.`,
      onConfirm: () => {
        deleteProjectMutation.mutate();
      },
      variant: 'destructive',
      isLoading: deleteProjectMutation.isPending,
    });
  };

  const handleDeleteMilestone = (milestoneId: number, milestoneTitle: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Milestone',
      description: `Are you sure you want to delete milestone "${milestoneTitle}"? This action cannot be undone.`,
      onConfirm: () => {
        deleteMilestoneMutation.mutate(milestoneId);
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      },
      variant: 'destructive',
    });
  };

    const handleDeleteTeam = (teamId: number, teamName: string) => {
      setConfirmationModal({
        isOpen: true,
        title: 'Delete Team',
        description: `Are you sure you want to delete team "${teamName}"? This action cannot be undone.`,
        onConfirm: () => {
          deleteTeamMutation.mutate(teamId);
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        },
        variant: 'destructive',
      });
    };

  const handleOpenMilestoneAssessmentBuilder = (milestoneId: number) => {
    setAssessmentMilestoneId(milestoneId);
    setAiQuestionCount(5);
    setAiQuestionTypes({ ...DEFAULT_AI_QUESTION_TYPES });
  };

  const handleToggleQuestionType = (type: QuestionTypeKey, checked: boolean | "indeterminate") => {
    setAiQuestionTypes((prev) => ({
      ...prev,
      [type]: checked === true,
    }));
  };

  const handleGenerateMilestonesAndAssessments = () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Generate Milestones & Assessments',
      description: `Generate AI-powered milestones and assessments for "${project?.title}"? This will create new milestones based on the project's component skills.`,
      onConfirm: () => {
        generateMilestonesAndAssessmentsMutation.mutate();
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      },
      variant: 'default',
    });
  };

  const handleStartProject = () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Start Project',
      description: `Start the project "${project?.title}"? This will change the status to active and students will be able to work on it.`,
      onConfirm: () => {
        startProjectMutation.mutate();
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      },
      variant: 'default',
    });
  };

  if (!isOpen) return null;

  if (projectLoading || milestonesLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading project details...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="text-center py-8">
            <p className="text-gray-600">Project not found</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-2xl font-bold">{readOnly ? "View Project" : "Manage Project"}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-6">
              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingProject && !readOnly ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="projectTitle">Project Title</Label>
                        <Input
                          id="projectTitle"
                          value={projectForm.title}
                          onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="projectDescription">Project Description</Label>
                        <Textarea
                          id="projectDescription"
                          value={projectForm.description}
                          onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="projectDueDate">Project Due Date</Label>
                        <Input
                          id="projectDueDate"
                          type="date"
                          value={projectForm.dueDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setProjectForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={handleSaveProject} disabled={updateProjectMutation.isPending}>
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditingProject(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{project.title}</h3>
                        <Badge variant={project.status === 'active' ? 'default' : project.status === 'completed' ? 'secondary' : 'outline'}>
                          {project.status === 'draft' ? 'Draft' : 
                           project.status === 'active' ? 'Active' : 
                           project.status === 'completed' ? 'Completed' : 'Archived'}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-4">{project.description ?? ""}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Created: {project.createdAt ? format(new Date(project.createdAt), 'MMM d, yyyy') : 'Unknown'}</span>
                        {project.dueDate && (
                          <span>Due: {format(new Date(project.dueDate), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Visibility Settings */}
              <Card className="bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Community Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Share to Project Explorer</p>
                      <p className="text-sm text-muted-foreground">
                        Make this project visible to other educators in the community library
                      </p>
                    </div>
                    {readOnly ? (
                      <Badge variant={project.isPublic ? "default" : "outline"}>
                        {project.isPublic ? "Public" : "Private"}
                      </Badge>
                    ) : (
                      <Button
                        variant={project.isPublic ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleVisibilityMutation.mutate(!project.isPublic)}
                        disabled={toggleVisibilityMutation.isPending}
                      >
                        {toggleVisibilityMutation.isPending ? (
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : project.isPublic ? (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Public
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Private
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {project.isPublic && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700">
                        This project is visible in the Project Explorer. Other educators can view and learn from it.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Teams */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Project Teams
                  </CardTitle>
                  {!readOnly && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowTeamModal(true)}
                      disabled={!project?.schoolId}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Team
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {teamsLoading ? (
                    <div>Loading teams...</div>
                  ) : teams.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-600 mb-4">No teams yet</div>
                      <div className="text-sm text-gray-500 mb-4">
                        {readOnly
                          ? "No teams have been created for this project."
                          : "Create teams to organize students for this project. All milestones will be automatically assigned to team members."}
                      </div>
                      {!readOnly && (
                        <Button onClick={() => setShowTeamModal(true)}>
                          Create First Team
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {teams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{team.name}</div>
                              <div className="text-sm text-gray-600">{team.description}</div>
                            </div>
                          </div>
                          {!readOnly && (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingTeam(team)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Team
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTeam(team.id, team.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Actions */}
              {!readOnly && (
                <div className="flex items-center justify-between pr-8">
                  <div className="flex items-center space-x-2">
                    {project?.status === 'draft' && (
                      <Button onClick={handleStartProject} className="bg-green-600 hover:bg-green-700 text-white">
                        <Play className="h-4 w-4 mr-2" />
                        Start Project
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleEditProject}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Project
                    </Button>
                    <Button variant="outline" onClick={() => handleGenerateMilestonesAndAssessments()}>
                      <Target className="h-4 w-4 mr-2" />
                      Generate Milestones
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteProject}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="milestones" className="space-y-6">
              {!readOnly && selectedMilestone && (
                <Card className="border border-blue-200 bg-blue-50/40">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-blue-900">
                      <span className="flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
                        AI-Powered Assessment Generation
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssessmentMilestoneId(null)}
                      >
                        Close
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-blue-200 bg-white p-4">
                      <p className="text-sm font-medium text-blue-900">Selected Milestone</p>
                      <p className="font-semibold text-gray-900 mt-1">{selectedMilestone.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedMilestone.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Due: {selectedMilestone.dueDate ? format(new Date(selectedMilestone.dueDate), 'MMM d, yyyy') : 'No due date'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border bg-white p-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">Project Competency Skills</p>
                        {componentSkillsLoading ? (
                          <p className="text-sm text-gray-500">Loading skills...</p>
                        ) : projectComponentSkills.length === 0 ? (
                          <p className="text-sm text-red-600">No component skills assigned to this project.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {projectComponentSkills.map((skill) => (
                              <Badge key={skill.id} variant="outline" className="text-xs">
                                {skill.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg border bg-white p-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">Project B.E.S.T. Standards</p>
                        {bestStandardsLoading ? (
                          <p className="text-sm text-gray-500">Loading standards...</p>
                        ) : projectBestStandards.length === 0 ? (
                          <p className="text-sm text-gray-600">No B.E.S.T. standards assigned to this project.</p>
                        ) : (
                          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                            {projectBestStandards.map((standard) => (
                              <div key={standard.id} className="text-xs text-gray-700">
                                <span className="font-semibold">{standard.benchmarkNumber}</span>
                                <span className="ml-1">{standard.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end rounded-lg border bg-white p-4">
                      <div className="space-y-2">
                        <Label htmlFor="ai-question-count" className="text-sm font-medium text-blue-900">
                          Number of Questions
                        </Label>
                        <Input
                          id="ai-question-count"
                          type="number"
                          min={1}
                          max={20}
                          value={aiQuestionCount}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            if (!Number.isNaN(nextValue) && nextValue >= 1 && nextValue <= 20) {
                              setAiQuestionCount(nextValue);
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-blue-900">Question Types</p>
                        <div className="space-y-2">
                          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionTypeKey[]).map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`question-type-${type}`}
                                checked={aiQuestionTypes[type]}
                                onCheckedChange={(checked) => handleToggleQuestionType(type, checked)}
                              />
                              <Label htmlFor={`question-type-${type}`} className="font-normal">
                                {QUESTION_TYPE_LABELS[type]}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          onClick={() => createMilestoneAssessmentMutation.mutate()}
                          disabled={
                            createMilestoneAssessmentMutation.isPending ||
                            componentSkillsLoading ||
                            (projectHasBestStandards && bestStandardsLoading) ||
                            projectComponentSkills.length === 0 ||
                            !hasSelectedQuestionType
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {createMilestoneAssessmentMutation.isPending ? 'Generating...' : 'Generate & Create Assessment'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Milestone Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    Milestone Timeline ({milestones.length} milestones)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {milestones.length === 0 ? (
                    <div className="text-center py-8">
                      No milestones yet
                      Milestones will be generated or created for this project.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {milestones
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((milestone, index) => (
                          <div key={milestone.id} className="relative">
                            {/* Timeline connector */}
                            {index < milestones.length - 1 && (
                              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300"></div>
                            )}

                            <div className="flex items-start space-x-4">
                              {/* Timeline dot */}
                              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">

                              </div>

                              {/* Milestone content */}
                              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                {editingMilestone === milestone.id && !readOnly ? (
                                  <div className="space-y-3">
                                    <div>
                                      <Label htmlFor={`milestoneTitle-${milestone.id}`}>Title</Label>
                                      <Input
                                        id={`milestoneTitle-${milestone.id}`}
                                        value={milestoneForm.title}
                                        onChange={(e) => setMilestoneForm(prev => ({ ...prev, title: e.target.value }))}
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor={`milestoneDescription-${milestone.id}`}>Description</Label>
                                      <Textarea
                                        id={`milestoneDescription-${milestone.id}`}
                                        value={milestoneForm.description}
                                        onChange={(e) => setMilestoneForm(prev => ({ ...prev, description: e.target.value }))}
                                        rows={2}
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor={`milestoneDueDate-${milestone.id}`}>Due Date</Label>
                                      <Input
                                        id={`milestoneDueDate-${milestone.id}`}
                                        type="date"
                                        value={milestoneForm.dueDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        max={project?.dueDate ? format(new Date(project.dueDate), 'yyyy-MM-dd') : undefined}
                                        onChange={(e) => setMilestoneForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Button size="sm" onClick={() => handleSaveMilestone(milestone.id)}>
                                        Save
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingMilestone(null)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                                        <Badge variant="outline">Milestone {milestone.order}</Badge>
                                      </div>
                                      <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
                                      <div className="flex items-center text-xs text-gray-500">
                                        Due: {milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM d, yyyy') : 'No due date'}
                                      </div>
                                    </div>
                                    {!readOnly && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                            </svg>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleOpenMilestoneAssessmentBuilder(milestone.id)}>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Create AI Assessment
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleEditMilestone(milestone)}>
                                            Edit Milestone
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleDeleteMilestone(milestone.id, milestone.title)}
                                            className="text-red-600 focus:text-red-600"
                                          >
                                            Delete Milestone
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            

            
          </Tabs>
        </div>

        {/* Team Selection Modal */}
        {!readOnly && project && (
          <ProjectTeamSelectionModal
            open={showTeamModal}
            onOpenChange={setShowTeamModal}
            projectId={projectId}
            schoolId={project.schoolId ?? undefined}
            onTeamCreated={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/teams`] });
            }}
          />
        )}

        {/* Team Edit Modal */}
        {!readOnly && editingTeam && project && (
          <TeamEditModal
            open={!!editingTeam}
            onOpenChange={(open) => !open && setEditingTeam(null)}
            team={editingTeam}
            schoolId={project.schoolId ?? undefined}
            onTeamUpdated={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/teams`] });
            }}
          />
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmationModal.onConfirm}
          title={confirmationModal.title}
          description={confirmationModal.description}
          variant={confirmationModal.variant}
          isLoading={deleteProjectMutation.isPending || confirmationModal.isLoading}
          confirmText={confirmationModal.variant === 'destructive' ? 'Delete' : 'Confirm'}
        />
      </DialogContent>
    </Dialog>
  );
}
