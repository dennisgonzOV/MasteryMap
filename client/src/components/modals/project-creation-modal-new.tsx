import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ComponentSkill {
  id: number;
  competencyId: number;
  name: string;
  description: string;
  rubricLevels: any;
}

interface Competency {
  id: number;
  learnerOutcomeId: number;
  name: string;
  description: string;
  category: string;
  componentSkills: ComponentSkill[];
}

interface LearnerOutcome {
  id: number;
  name: string;
  description: string;
  competencies: Competency[];
}

interface ProjectData {
  title: string;
  description: string;
  dueDate?: string;
  competencyIds: number[];
  componentSkillIds: number[];
}

interface ProjectData {
  title: string;
  description: string;
  componentSkillIds: number[];
}

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProjectCreationModal({ isOpen, onClose, onSuccess }: ProjectCreationModalProps) {
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<Set<number>>(new Set());
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<number>>(new Set());
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<number>>(new Set());
  const [generateMilestones, setGenerateMilestones] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the complete 3-level hierarchy
  const { data: hierarchyData = [], isLoading } = useQuery<LearnerOutcome[]>({
    queryKey: ['/api/learner-outcomes-hierarchy/complete'],
    enabled: isOpen,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectData) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }
      
      return response.json();
    },
    onSuccess: async (createdProject) => {
      toast({
        title: "Success",
        description: "Project created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Automatically generate milestones and assessments if option is checked
      if (generateMilestones && selectedSkills.size > 0) {
        try {
          const response = await fetch(`/api/projects/${createdProject.id}/generate-milestones-and-assessments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            toast({
              title: "AI Generation Complete",
              description: data.message || "Milestones and assessments generated successfully!",
            });
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${createdProject.id}/milestones`] });
            queryClient.invalidateQueries({ queryKey: ["/api/assessments/standalone"] });
          } else {
            console.error('Failed to generate milestones and assessments');
          }
        } catch (error) {
          console.error('Error generating milestones and assessments:', error);
        }
      }
      
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setProjectTitle('');
    setProjectDescription('');
    setProjectDueDate('');
    setSelectedSkills(new Set());
    setExpandedOutcomes(new Set());
    setExpandedCompetencies(new Set());
    setGenerateMilestones(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleOutcomeExpansion = (outcomeId: number) => {
    setExpandedOutcomes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outcomeId)) {
        newSet.delete(outcomeId);
      } else {
        newSet.add(outcomeId);
      }
      return newSet;
    });
  };

  const toggleCompetencyExpansion = (competencyId: number) => {
    setExpandedCompetencies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(competencyId)) {
        newSet.delete(competencyId);
      } else {
        newSet.add(competencyId);
      }
      return newSet;
    });
  };

  const toggleSkillSelection = (skillId: number) => {
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skillId)) {
        newSet.delete(skillId);
      } else {
        newSet.add(skillId);
      }
      return newSet;
    });
  };

  // Check if all skills in a competency are selected
  const isCompetencyFullySelected = (competency: Competency) => {
    return competency.componentSkills.every(skill => selectedSkills.has(skill.id));
  };

  // Check if any skills in a competency are selected
  const isCompetencyPartiallySelected = (competency: Competency) => {
    return competency.componentSkills.some(skill => selectedSkills.has(skill.id));
  };

  // Toggle all skills in a competency
  const toggleCompetencySelection = (competency: Competency) => {
    const allSelected = isCompetencyFullySelected(competency);
    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      competency.componentSkills.forEach(skill => {
        if (allSelected) {
          newSet.delete(skill.id);
        } else {
          newSet.add(skill.id);
        }
      });
      return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectTitle.trim()) {
      toast({
        title: "Error",
        description: "Project title is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedSkills.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one component skill",
        variant: "destructive",
      });
      return;
    }

    // Get all competency IDs from selected component skills
    const selectedCompetencyIds = new Set<number>();
    hierarchyData.forEach((outcome) => {
      outcome.competencies?.forEach((competency) => {
        competency.componentSkills?.forEach((skill) => {
          if (selectedSkills.has(skill.id)) {
            selectedCompetencyIds.add(competency.id);
          }
        });
      });
    });

    createProjectMutation.mutate({
      title: projectTitle,
      description: projectDescription,
      dueDate: projectDueDate || undefined,
      competencyIds: Array.from(selectedCompetencyIds),
      componentSkillIds: Array.from(selectedSkills),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Enter project title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={projectDueDate}
                onChange={(e) => setProjectDueDate(e.target.value)}
                placeholder="Select due date"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="generateMilestones"
                checked={generateMilestones}
                onCheckedChange={(checked) => setGenerateMilestones(checked as boolean)}
              />
              <Label htmlFor="generateMilestones" className="text-sm font-medium">
                Automatically generate milestones and assessments with AI
              </Label>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <Label className="text-base font-semibold">Select Component Skills</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Choose the specific component skills students will develop in this project
            </p>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-muted-foreground">Loading competency framework...</div>
              </div>
            ) : (
              <ScrollArea className="h-96 border rounded-md p-4">
                <div className="space-y-2">
                  {hierarchyData?.map((outcome: LearnerOutcome) => (
                    <div key={outcome.id} className="border border-gray-200 rounded-lg">
                      {/* Learner Outcome Header */}
                      <div
                        className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 cursor-pointer rounded-t-lg"
                        onClick={() => toggleOutcomeExpansion(outcome.id)}
                      >
                        {expandedOutcomes.has(outcome.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-blue-900">{outcome.name}</span>
                        <span className="text-sm text-blue-700">({outcome.competencies.length} competencies)</span>
                      </div>

                      {/* Competencies */}
                      {expandedOutcomes.has(outcome.id) && (
                        <div className="border-t border-gray-200">
                          {outcome.competencies.map((competency: Competency) => (
                            <div key={competency.id} className="border-b border-gray-100 last:border-b-0">
                              {/* Competency Header */}
                              <div className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100">
                                <div
                                  className="flex items-center gap-2 flex-1 cursor-pointer"
                                  onClick={() => toggleCompetencyExpansion(competency.id)}
                                >
                                  {expandedCompetencies.has(competency.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <span className="font-medium">{competency.name}</span>
                                  <span className="text-sm text-gray-600">
                                    ({competency.componentSkills.length} skills)
                                  </span>
                                </div>
                                <Checkbox
                                  checked={isCompetencyFullySelected(competency)}
                                  onCheckedChange={() => toggleCompetencySelection(competency)}
                                />
                              </div>

                              {/* Component Skills */}
                              {expandedCompetencies.has(competency.id) && (
                                <div className="pl-6 pr-3 pb-2">
                                  {competency.componentSkills.map((skill: ComponentSkill) => (
                                    <div key={skill.id} className="flex items-center gap-2 py-2">
                                      <Checkbox
                                        checked={selectedSkills.has(skill.id)}
                                        onCheckedChange={() => toggleSkillSelection(skill.id)}
                                      />
                                      <span className="text-sm">{skill.name}</span>
                                      {selectedSkills.has(skill.id) && (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedSkills.size > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>{selectedSkills.size}</strong> component skills selected
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}