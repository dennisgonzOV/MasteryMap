import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ChevronDown, ChevronRight, CheckCircle, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectIdea?: {
    title: string;
    description: string;
    selectedComponentSkillIds: number[];
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
  const [standardsSearchTerm, setStandardsSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [activeTab, setActiveTab] = useState('skills');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the complete 3-level hierarchy
  const { data: hierarchyData = [], isLoading, error } = useQuery<LearnerOutcome[]>({
    queryKey: ['/api/competencies/learner-outcomes-hierarchy/complete'],
    enabled: isOpen,
    queryFn: async () => {
      console.log('Custom queryFn: Making request to /api/learner-outcomes-hierarchy/complete');
      const response = await fetch('/api/competencies/learner-outcomes-hierarchy/complete', {
        credentials: 'include',
      });
      console.log('Custom queryFn: Response status:', response.status);
      console.log('Custom queryFn: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const text = await response.text();
        console.log('Custom queryFn: Error response text:', text);
        throw new Error(`${response.status}: ${text}`);
      }
      
      const data = await response.json();
      console.log('Custom queryFn: Raw response data:', JSON.stringify(data, null, 2));
      console.log('Custom queryFn: Data type:', typeof data);
      console.log('Custom queryFn: Is array:', Array.isArray(data));
      
      if (Array.isArray(data)) {
        console.log('Custom queryFn: Array length:', data.length);
        if (data.length > 0) {
          console.log('Custom queryFn: First item:', JSON.stringify(data[0], null, 2));
          console.log('Custom queryFn: First item competencies:', data[0].competencies?.length);
        }
      } else {
        console.log('Custom queryFn: Data keys:', Object.keys(data));
        console.log('Converting non-array response to empty array');
        return [];
      }
      return data;
    },
  });

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened - hierarchyData:', hierarchyData);
      console.log('Modal opened - isLoading:', isLoading);
      console.log('Modal opened - error:', error);
      console.log('Modal opened - error details:', error?.message);
      console.log('Modal opened - hierarchyData length:', hierarchyData?.length);
      if (error) {
        console.log('Error object:', error);
        console.log('Error message:', error.message);
        console.log('Error cause:', error.cause);
      }
      if (hierarchyData && hierarchyData.length > 0) {
        console.log('First outcome:', hierarchyData[0]);
        console.log('First outcome competencies:', hierarchyData[0]?.competencies);
        console.log('First competency skills:', hierarchyData[0]?.competencies?.[0]?.componentSkills);
      }
    }
  }, [isOpen, hierarchyData, isLoading, error]);

  // Fetch B.E.S.T. Standards metadata for filters
  const { data: standardsMetadata } = useQuery({
    queryKey: ['/api/competencies/best-standards/metadata'],
    enabled: isOpen,
  });

  // Fetch B.E.S.T. Standards based on search/filter criteria
  const { data: bestStandards = [], isLoading: isLoadingStandards, error: standardsError } = useQuery({
    queryKey: ['/api/competencies/best-standards', {
      search: standardsSearchTerm?.trim() || undefined,
      subject: (selectedSubject && selectedSubject !== 'all') ? selectedSubject : undefined,
      grade: (selectedGrade && selectedGrade !== 'all') ? selectedGrade : undefined
    }],
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
    }
  }, [projectIdea, isOpen, hierarchyData]);

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
            queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
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
    setSelectedStandards(new Set());
    setExpandedOutcomes(new Set());
    setExpandedCompetencies(new Set());
    setGenerateMilestones(true);
    setStandardsSearchTerm('');
    setSelectedSubject('');
    setSelectedGrade('');
    setActiveTab('skills');
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

    createProjectMutation.mutate({
      title: projectTitle,
      description: projectDescription,
      dueDate: projectDueDate || undefined,
      componentSkillIds: Array.from(selectedSkills),
      bestStandardIds: Array.from(selectedStandards),
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search standards..."
                        value={standardsSearchTerm}
                        onChange={(e) => setStandardsSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedSubject || "all"} onValueChange={(value) => setSelectedSubject(value === "all" ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {(standardsMetadata as any)?.subjects?.map((subject: string) => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedGrade || "all"} onValueChange={(value) => setSelectedGrade(value === "all" ? "" : value)}>
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
                  <div className="max-h-[350px] overflow-y-auto border rounded-md p-4">
                    <div className="space-y-3">
                        {(bestStandards as any[]).map((standard: any) => (
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
                    </div>
                  </div>
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