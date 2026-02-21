import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, CheckCircle, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildBestStandardsUrl } from '@/lib/standards';
import type { ProjectIdeaMilestoneDTO, ProjectIdeaSnapshotDTO } from '@shared/contracts/api';

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
  componentSkillIds: number[];
  bestStandardIds: number[];
  isPublic?: boolean;
  subjectArea?: string;
  gradeLevel?: string;
  estimatedDuration?: string;
  learningOutcomes?: string[];
  requiredResources?: string[];
  ideaSnapshot?: ProjectIdeaSnapshotDTO | null;
}

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectIdea?: {
    title: string;
    description: string;
    selectedComponentSkillIds: number[];
    bestStandardIds?: number[];
    subject?: string;
    topic?: string;
    gradeLevel?: string;
    duration?: string;
    overview?: string;
    suggestedMilestones?: ProjectIdeaMilestoneDTO[];
    assessmentSuggestions?: Array<{ type: string; description: string }>;
    requiredResources?: string[];
    learningOutcomes?: string[];
    competencyAlignment?: string[];
  };
}

export default function ProjectCreationModal({ isOpen, onClose, onSuccess, projectIdea }: ProjectCreationModalProps) {
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<Set<number>>(new Set());
  const [selectedStandards, setSelectedStandards] = useState<Set<number>>(new Set());
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<number>>(new Set());
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<number>>(new Set());
  const [generateMilestones, setGenerateMilestones] = useState(true);
  const [useIdeaMilestones, setUseIdeaMilestones] = useState(false);
  const [standardsSearchTerm, setStandardsSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedBodyOfKnowledge, setSelectedBodyOfKnowledge] = useState('');
  const [standardsDisplayLimit, setStandardsDisplayLimit] = useState(50);
  const [activeTab, setActiveTab] = useState('skills');
  const [isPublic, setIsPublic] = useState(false);
  const [projectSubjectArea, setProjectSubjectArea] = useState('');
  const [projectGradeLevel, setProjectGradeLevel] = useState('');
  const [projectDuration, setProjectDuration] = useState('');
  const hasIdeaMilestones = Boolean(projectIdea?.suggestedMilestones && projectIdea.suggestedMilestones.length > 0);

  const subjectAreaOptions = ['Math', 'Science', 'English', 'Social Studies', 'Art', 'Music', 'Physical Education', 'Technology', 'Foreign Language', 'Other'];
  const gradeLevelOptions = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const durationOptions = ['1-2 weeks', '3-4 weeks', '5-6 weeks', '7-8 weeks', '9+ weeks'];

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the complete 3-level hierarchy
  const { data: hierarchyData = [], isLoading, error } = useQuery<LearnerOutcome[]>({
    queryKey: ['/api/competencies/learner-outcomes-hierarchy/complete'],
    enabled: isOpen,
    queryFn: async () => {
      const response = await fetch('/api/competencies/learner-outcomes-hierarchy/complete', {
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }
      return data;
    },
  });

  // Fetch B.E.S.T. Standards metadata for filters
  const { data: standardsMetadata } = useQuery({
    queryKey: ['/api/competencies/best-standards/metadata'],
    enabled: isOpen,
  });

  const mapProjectSubjectToBestSubject = (subject?: string): string => {
    const normalized = subject?.trim().toLowerCase();
    if (!normalized) return '';
    if (normalized === 'english' || normalized === 'english language arts' || normalized === 'english language arts (b.e.s.t.)') return 'English';
    if (normalized === 'math' || normalized === 'mathematics' || normalized === 'mathematics (b.e.s.t.)') return 'Math';
    if (normalized === 'science') return 'Science';
    if (normalized === 'social studies') return 'Social Studies';
    return '';
  };

  const standardsSubjectOptions = Array.from(
    new Set([
      'English',
      'Math',
      'Science',
      'Social Studies',
      ...(((standardsMetadata as any)?.subjects as string[] | undefined) ?? []),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const standardsBodyOfKnowledgeOptions = Array.from(
    new Set((((standardsMetadata as any)?.bodyOfKnowledge as string[] | undefined) ?? [])),
  ).sort((a, b) => a.localeCompare(b));

  const bestStandardsUrl = buildBestStandardsUrl({
    searchTerm: standardsSearchTerm,
    subject: selectedSubject,
    grade: selectedGrade,
    bodyOfKnowledge: selectedBodyOfKnowledge,
  });

  // Fetch B.E.S.T. Standards based on search/filter criteria
  const { data: bestStandards = [], isLoading: isLoadingStandards, error: standardsError } = useQuery({
    queryKey: [bestStandardsUrl],
    enabled: isOpen,
    retry: (failureCount, error) => {
      // Don't retry on validation errors
      if (error?.message?.includes('parameter')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Populate form when projectIdea is provided
  useEffect(() => {
    if (projectIdea && isOpen) {
      setProjectTitle(projectIdea.title);
      setProjectDescription(projectIdea.description);
      setSelectedSkills(new Set(projectIdea.selectedComponentSkillIds));
      setUseIdeaMilestones(Boolean(projectIdea.suggestedMilestones && projectIdea.suggestedMilestones.length > 0));
      if (projectIdea.bestStandardIds) {
        setSelectedStandards(new Set(projectIdea.bestStandardIds));
      }
      if (projectIdea.gradeLevel) {
        setProjectGradeLevel(projectIdea.gradeLevel);
      }
      if (projectIdea.duration) {
        setProjectDuration(projectIdea.duration);
      }
      if (projectIdea.subject) {
        setProjectSubjectArea(projectIdea.subject);
      }

      // Expand all relevant outcomes and competencies that contain the selected skills
      if (hierarchyData && hierarchyData.length > 0) {
        const newExpandedOutcomes = new Set<number>();
        const newExpandedCompetencies = new Set<number>();

        hierarchyData.forEach((outcome) => {
          let hasSelectedSkill = false;
          outcome.competencies?.forEach((competency) => {
            let competencyHasSelectedSkill = false;
            competency.componentSkills?.forEach((skill) => {
              if (projectIdea.selectedComponentSkillIds.includes(skill.id)) {
                hasSelectedSkill = true;
                competencyHasSelectedSkill = true;
              }
            });
            if (competencyHasSelectedSkill) {
              newExpandedCompetencies.add(competency.id);
            }
          });
          if (hasSelectedSkill) {
            newExpandedOutcomes.add(outcome.id);
          }
        });

        setExpandedOutcomes(newExpandedOutcomes);
        setExpandedCompetencies(newExpandedCompetencies);
      }
    } else if (isOpen) {
      setUseIdeaMilestones(false);
    }
  }, [projectIdea, isOpen, hierarchyData]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'standards' || selectedSubject) {
      return;
    }

    const mappedSubject = mapProjectSubjectToBestSubject(projectSubjectArea || projectIdea?.subject);
    if (mappedSubject) {
      setSelectedSubject(mappedSubject);
      setStandardsDisplayLimit(50);
    }
  }, [isOpen, activeTab, selectedSubject, projectSubjectArea, projectIdea?.subject]);

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
      const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
        try {
          const payload = await response.json();
          if (payload && typeof payload.message === 'string' && payload.message.trim().length > 0) {
            return payload.message;
          }
        } catch {
          // Keep fallback when body is not valid JSON
        }
        return fallback;
      };

      toast({
        title: "Success",
        description: "Project created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      // Generate thumbnail for the project (especially when coming from a project idea)
      if (projectIdea) {
        try {
          const thumbnailResponse = await fetch(`/api/projects/${createdProject.id}/generate-thumbnail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: projectIdea.subject,
              topic: projectIdea.topic
            }),
            credentials: 'include',
          });

          if (thumbnailResponse.ok) {
            toast({
              title: "Thumbnail Generated",
              description: "Project thumbnail has been created!",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
            queryClient.invalidateQueries({ queryKey: ['/api/projects', createdProject.id] });
          } else {
            let errorMessage = 'Failed to generate thumbnail';
            try {
              const errorPayload = await thumbnailResponse.json();
              errorMessage = errorPayload?.message || errorMessage;
            } catch {
              // Keep fallback error message if response body isn't JSON
            }
            console.error('Failed to generate thumbnail:', errorMessage);
            toast({
              title: "Thumbnail Failed",
              description: errorMessage,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error generating thumbnail:', error);
          toast({
            title: "Thumbnail Failed",
            description: "There was a network or server error while generating the thumbnail.",
            variant: "destructive",
          });
        }
      }

      // Add milestones after project creation using either the selected idea's milestones or AI regeneration.
      if (generateMilestones) {
        try {
          let milestonesGenerated = false;

          if (useIdeaMilestones && hasIdeaMilestones && projectIdea?.suggestedMilestones) {
            const seedResponse = await fetch(`/api/projects/${createdProject.id}/seed-milestones-from-idea`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                suggestedMilestones: projectIdea.suggestedMilestones,
              }),
            });

            if (seedResponse.ok) {
              const data = await seedResponse.json();
              toast({
                title: "Milestones Added",
                description: data.message || "Milestones were created from the selected idea.",
              });
              queryClient.invalidateQueries({ queryKey: [`/api/projects/${createdProject.id}/milestones`] });
              milestonesGenerated = true;
            } else {
              const errorMessage = await readErrorMessage(seedResponse, 'Failed to create milestones from selected idea');
              toast({
                title: "Idea Milestones Failed",
                description: `${errorMessage} Falling back to AI milestone generation when possible.`,
                variant: "destructive",
              });
            }
          }

          if (!milestonesGenerated && selectedSkills.size > 0) {
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
              queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
              milestonesGenerated = true;
            } else {
              const errorMessage = await readErrorMessage(response, 'Failed to generate milestones and assessments');
              toast({
                title: "Milestones Not Generated",
                description: errorMessage,
                variant: "destructive",
              });
            }
          }

          if (!milestonesGenerated && selectedSkills.size === 0 && selectedStandards.size > 0) {
            toast({
              title: "Milestones Not Generated",
              description: "Automatic AI milestone generation requires at least one component skill. Add a component skill or use suggested idea milestones.",
              variant: "destructive",
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unexpected error while generating milestones';
          toast({
            title: "Milestone Generation Error",
            description: message,
            variant: "destructive",
          });
          console.error('Error creating milestones after project creation:', error);
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
    setSelectedStandards(new Set());
    setExpandedOutcomes(new Set());
    setExpandedCompetencies(new Set());
    setGenerateMilestones(true);
    setUseIdeaMilestones(false);
    setStandardsSearchTerm('');
    setSelectedSubject('');
    setSelectedGrade('');
    setSelectedBodyOfKnowledge('');
    setStandardsDisplayLimit(50);
    setActiveTab('skills');
    setIsPublic(false);
    setProjectSubjectArea('');
    setProjectGradeLevel('');
    setProjectDuration('');
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

  // B.E.S.T. Standards helper functions
  const toggleStandardSelection = (standardId: number) => {
    setSelectedStandards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(standardId)) {
        newSet.delete(standardId);
      } else {
        newSet.add(standardId);
      }
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

    if (selectedSkills.size === 0 && selectedStandards.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one component skill or B.E.S.T. standard",
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

    const ideaSnapshot: ProjectIdeaSnapshotDTO | null = projectIdea
      ? {
          title: projectIdea.title,
          description: projectIdea.description,
          overview: projectIdea.overview ?? null,
          suggestedMilestones: projectIdea.suggestedMilestones ?? [],
          assessmentSuggestions: projectIdea.assessmentSuggestions ?? [],
          requiredResources: projectIdea.requiredResources ?? [],
          learningOutcomes: projectIdea.learningOutcomes ?? [],
          competencyAlignment: projectIdea.competencyAlignment ?? [],
          subject: projectIdea.subject ?? null,
          topic: projectIdea.topic ?? null,
          gradeLevel: projectIdea.gradeLevel ?? null,
          duration: projectIdea.duration ?? null,
        }
      : null;

    createProjectMutation.mutate({
      title: projectTitle,
      description: projectDescription,
      dueDate: projectDueDate || undefined,
      componentSkillIds: Array.from(selectedSkills),
      bestStandardIds: Array.from(selectedStandards),
      isPublic,
      subjectArea: projectSubjectArea || undefined,
      gradeLevel: projectGradeLevel || undefined,
      estimatedDuration: projectDuration || undefined,
      learningOutcomes: projectIdea?.learningOutcomes ?? [],
      requiredResources: projectIdea?.requiredResources ?? [],
      ideaSnapshot,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ModalErrorBoundary>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pb-6">
            <div className="space-y-4">
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subjectArea">Subject Area</Label>
                  <Select value={projectSubjectArea} onValueChange={setProjectSubjectArea}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectAreaOptions.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gradeLevel">Grade Level</Label>
                  <Select value={projectGradeLevel} onValueChange={setProjectGradeLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeLevelOptions.map(grade => (
                        <SelectItem key={grade} value={grade}>
                          {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Estimated Duration</Label>
                  <Select value={projectDuration} onValueChange={setProjectDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map(duration => (
                        <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                <div>
                  <Label htmlFor="isPublic" className="text-sm font-medium">Share to Project Explorer</Label>
                  <p className="text-xs text-muted-foreground">Make this project visible to other educators in the community library</p>
                </div>
                <Checkbox
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generateMilestones"
                  checked={generateMilestones}
                  onCheckedChange={(checked) => setGenerateMilestones(checked as boolean)}
                />
                <Label htmlFor="generateMilestones" className="text-sm font-medium">
                  Automatically add milestones after project creation
                </Label>
              </div>
              {generateMilestones && hasIdeaMilestones && (
                <div className="ml-6 flex items-center space-x-2 rounded-md border border-blue-200 bg-blue-50/50 p-3">
                  <Checkbox
                    id="useIdeaMilestones"
                    checked={useIdeaMilestones}
                    onCheckedChange={(checked) => setUseIdeaMilestones(checked as boolean)}
                  />
                  <Label htmlFor="useIdeaMilestones" className="text-sm text-blue-900">
                    Use suggested milestones from the selected idea (skip AI regeneration)
                  </Label>
                </div>
              )}
              {generateMilestones && !useIdeaMilestones && (
                <p className="ml-6 text-xs text-muted-foreground">
                  AI will generate both milestones and assessments from your selected standards.
                </p>
              )}
            </div>

            <div>
              <Label className="text-base font-semibold">Select Learning Standards</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose the component skills and/or B.E.S.T. standards for this project
              </p>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="skills">Component Skills</TabsTrigger>
                  <TabsTrigger value="standards">B.E.S.T. Standards</TabsTrigger>
                </TabsList>

                <TabsContent value="skills" className="space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-muted-foreground">Loading competency framework...</div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-red-500">Error loading component skills: {error.message}</div>
                    </div>
                  ) : !hierarchyData || hierarchyData.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-muted-foreground">No component skills found. Please check your database.</div>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto border rounded-md p-4">
                      <div className="space-y-2">
                        {hierarchyData.map((outcome: LearnerOutcome) => (
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
                                {outcome.competencies && outcome.competencies.length > 0 ? (
                                  outcome.competencies.map((competency: Competency) => (
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
                                          {competency.componentSkills && competency.componentSkills.length > 0 ? (
                                            competency.componentSkills.map((skill: ComponentSkill) => (
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
                                            ))
                                          ) : (
                                            <div className="text-sm text-gray-500 py-2">
                                              No component skills found for this competency
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-gray-500 py-4 text-center">
                                    No competencies found for this learner outcome
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="standards" className="space-y-3">
                  {/* B.E.S.T. Standards Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search standards..."
                        value={standardsSearchTerm}
                        onChange={(e) => { setStandardsSearchTerm(e.target.value); setStandardsDisplayLimit(50); }}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedSubject || "all"} onValueChange={(value) => { setSelectedSubject(value === "all" ? "" : value); setStandardsDisplayLimit(50); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {standardsSubjectOptions.map((subject: string) => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedGrade || "all"} onValueChange={(value) => { setSelectedGrade(value === "all" ? "" : value); setStandardsDisplayLimit(50); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {(standardsMetadata as any)?.grades?.map((grade: string) => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedBodyOfKnowledge || "all"} onValueChange={(value) => { setSelectedBodyOfKnowledge(value === "all" ? "" : value); setStandardsDisplayLimit(50); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by body of knowledge" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Bodies of Knowledge</SelectItem>
                        {standardsBodyOfKnowledgeOptions.map((body: string) => (
                          <SelectItem key={body} value={body}>{body}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* B.E.S.T. Standards List */}
                  {isLoadingStandards ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-muted-foreground">Loading B.E.S.T. standards...</div>
                    </div>
                  ) : standardsError ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-red-500">Error loading B.E.S.T. standards. Please check your search criteria.</div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-muted-foreground">
                        Tip: if you are looking for Science or Social Studies, use the Subject filter above.
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Showing {Math.min(standardsDisplayLimit, (bestStandards as any[]).length)} of {(bestStandards as any[]).length} standards
                        {selectedStandards.size > 0 && (
                          <span className="ml-2 font-medium text-green-700">({selectedStandards.size} selected)</span>
                        )}
                      </div>
                      <div className="max-h-[350px] overflow-y-auto border rounded-md p-4">
                        <div className="space-y-3">
                          {(bestStandards as any[]).slice(0, standardsDisplayLimit).map((standard: any) => (
                            <div key={standard.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedStandards.has(standard.id)}
                                  onCheckedChange={() => toggleStandardSelection(standard.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-blue-900">{standard.benchmarkNumber}</span>
                                    {selectedStandards.has(standard.id) && (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700">{standard.description}</p>
                                  <div className="flex gap-2 text-xs text-gray-500">
                                    {standard.subject && <span className="bg-blue-100 px-2 py-1 rounded">{standard.subject}</span>}
                                    {standard.grade && <span className="bg-green-100 px-2 py-1 rounded">Grade {standard.grade}</span>}
                                    {standard.bodyOfKnowledge && <span className="bg-purple-100 px-2 py-1 rounded">{standard.bodyOfKnowledge}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {(bestStandards as any[]).length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                              No standards found matching your criteria
                            </div>
                          )}
                          {(bestStandards as any[]).length > standardsDisplayLimit && (
                            <button
                              type="button"
                              onClick={() => setStandardsDisplayLimit(prev => prev + 50)}
                              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              Load More ({(bestStandards as any[]).length - standardsDisplayLimit} remaining)
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>

              {/* Selection Summary */}
              {(selectedSkills.size > 0 || selectedStandards.size > 0) && (
                <div className="mt-3 p-3 bg-green-50 rounded-md">
                  <div className="text-sm text-green-800 space-y-1">
                    {selectedSkills.size > 0 && (
                      <p><strong>{selectedSkills.size}</strong> component skills selected</p>
                    )}
                    {selectedStandards.size > 0 && (
                      <p><strong>{selectedStandards.size}</strong> B.E.S.T. standards selected</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </ModalErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
