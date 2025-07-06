import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { 
  Calendar,
  Clock, 
  Target,
  MoreVertical,
  Trash2,
  Edit,
  Users,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Sparkles
} from 'lucide-react';

interface ProjectManagementModalProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface Milestone {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  projectId: number;
  order: number;
  createdAt: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  teacherId: number;
  componentSkillIds: number[];
  createdAt: string;
}

export default function ProjectManagementModal({ projectId, isOpen, onClose }: ProjectManagementModalProps) {
  const { toast } = useToast();
  const [editingProject, setEditingProject] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: ''
  });
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: isOpen && !!projectId,
  });

  // Fetch project milestones
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: [`/api/projects/${projectId}/milestones`],
    enabled: isOpen && !!projectId,
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (updates: { title: string; description: string }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update project');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Project updated successfully" });
      setEditingProject(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Project deleted successfully" });
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, updates }: { milestoneId: number; updates: any }) => {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update milestone');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Milestone updated successfully" });
      setEditingMilestone(null);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete milestone mutation
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete milestone');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Milestone deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate milestones and assessments mutation
  const generateMilestonesAndAssessmentsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/generate-milestones-and-assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to generate milestones and assessments');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Generation successful",
        description: data.message || "Milestones and assessments generated successfully"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments/standalone"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditProject = () => {
    if (project) {
      setProjectForm({
        title: project.title,
        description: project.description
      });
      setEditingProject(true);
    }
  };

  const handleSaveProject = () => {
    updateProjectMutation.mutate(projectForm);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate ? format(new Date(milestone.dueDate), 'yyyy-MM-dd') : ''
    });
    setEditingMilestone(milestone.id);
  };

  const handleSaveMilestone = (milestoneId: number) => {
    updateMilestoneMutation.mutate({
      milestoneId,
      updates: {
        ...milestoneForm,
        dueDate: milestoneForm.dueDate ? new Date(milestoneForm.dueDate) : undefined
      }
    });
  };

  const handleDeleteProject = () => {
    if (confirm(`Are you sure you want to delete "${project?.title}"? This will also delete all milestones. This action cannot be undone.`)) {
      deleteProjectMutation.mutate();
    }
  };

  const handleDeleteMilestone = (milestoneId: number, milestoneTitle: string) => {
    if (confirm(`Are you sure you want to delete milestone "${milestoneTitle}"? This action cannot be undone.`)) {
      deleteMilestoneMutation.mutate(milestoneId);
    }
  };

  const handleGenerateMilestonesAndAssessments = () => {
    if (confirm(`Generate AI-powered milestones and assessments for "${project?.title}"? This will create new milestones based on the project's component skills.`)) {
      generateMilestonesAndAssessmentsMutation.mutate();
    }
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
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Manage Project</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleEditProject}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </Button>
              <Button variant="outline" onClick={() => handleGenerateMilestonesAndAssessments()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Milestones & Assessments
              </Button>
              <Button variant="destructive" onClick={handleDeleteProject}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingProject ? (
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
                  <div className="flex items-center space-x-2">
                    <Button onClick={handleSaveProject} disabled={updateProjectMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingProject(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                  <p className="text-gray-600 mb-4">{project.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created: {format(new Date(project.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestone Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Milestone Timeline ({milestones.length} milestones)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No milestones yet</h3>
                  <p className="text-gray-600">Milestones will be generated or created for this project.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones
                    .sort((a, b) => a.order - b.order)
                    .map((milestone, index) => (
                      <div key={milestone.id} className="relative">
                        {/* Timeline connector */}
                        {index < milestones.length - 1 && (
                          <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300"></div>
                        )}
                        
                        <div className="flex items-start space-x-4">
                          {/* Timeline dot */}
                          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-blue-600" />
                          </div>
                          
                          {/* Milestone content */}
                          <div className="flex-1 bg-gray-50 rounded-lg p-4">
                            {editingMilestone === milestone.id ? (
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
                                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button size="sm" onClick={() => handleSaveMilestone(milestone.id)}>
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingMilestone(null)}>
                                    <X className="h-4 w-4 mr-1" />
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
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Due: {milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM d, yyyy') : 'No due date'}
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditMilestone(milestone)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Milestone
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteMilestone(milestone.id, milestone.title)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Milestone
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}