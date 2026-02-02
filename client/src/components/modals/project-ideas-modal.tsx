import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lightbulb,
  Loader2,
  Sparkles,
  Plus,
  Clock,
  Target,
  Users,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Search
} from "lucide-react";

const projectIdeaSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  topic: z.string().min(1, "Topic is required"),
  gradeLevel: z.string().min(1, "Grade level is required"),
  duration: z.string().min(1, "Duration is required"),
  componentSkillIds: z.array(z.number()),
  bestStandardIds: z.array(z.number()).optional(),
});

type ProjectIdeaForm = z.infer<typeof projectIdeaSchema>;

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

interface ProjectIdea {
  title: string;
  description: string;
  overview: string;
  suggestedMilestones: Array<{
    title: string;
    description: string;
    estimatedDuration: string;
  }>;
  assessmentSuggestions: Array<{
    type: string;
    description: string;
  }>;
  requiredResources: string[];
  learningOutcomes: string[];
  competencyAlignment: string[];
}

interface ProjectIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIdea?: (idea: ProjectIdea & { selectedComponentSkillIds: number[]; subject?: string; topic?: string }) => void;
}

export default function ProjectIdeasModal({
  isOpen,
  onClose,
  onSelectIdea
}: ProjectIdeasModalProps) {
  const { toast } = useToast();
  const [generatedIdeas, setGeneratedIdeas] = useState<ProjectIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ProjectIdea | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<number>>(new Set());
  const [selectedStandards, setSelectedStandards] = useState<Set<number>>(new Set());
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<number>>(new Set());
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState('skills');
  const [standardsSearchTerm, setStandardsSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  // Fetch the complete 3-level hierarchy
  const { data: hierarchyData = [], isLoading } = useQuery<LearnerOutcome[]>({
    queryKey: ['/api/competencies/learner-outcomes-hierarchy/complete'],
    enabled: isOpen,
  });

  // Fetch B.E.S.T. Standards metadata for filters
  const { data: standardsMetadata } = useQuery({
    queryKey: ['/api/competencies/best-standards/metadata'],
    enabled: isOpen,
  });

  // Build URL with query parameters for B.E.S.T. Standards filtering
  const bestStandardsUrl = (() => {
    const params = new URLSearchParams();
    if (standardsSearchTerm?.trim()) {
      params.set('search', standardsSearchTerm.trim());
    }
    if (selectedSubject && selectedSubject !== 'all') {
      params.set('subject', selectedSubject);
    }
    if (selectedGrade && selectedGrade !== 'all') {
      params.set('grade', selectedGrade);
    }
    const queryString = params.toString();
    return queryString ? `/api/competencies/best-standards?${queryString}` : '/api/competencies/best-standards';
  })();

  // Fetch B.E.S.T. Standards based on search/filter criteria
  const { data: bestStandards = [], isLoading: isLoadingStandards, error: standardsError } = useQuery({
    queryKey: [bestStandardsUrl],
    enabled: isOpen,
    retry: (failureCount, error) => {
      if (error?.message?.includes('parameter')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Debug logging
  console.log('Project Ideas Modal - hierarchyData:', hierarchyData);
  console.log('Project Ideas Modal - isLoading:', isLoading);

  const form = useForm<ProjectIdeaForm>({
    resolver: zodResolver(projectIdeaSchema),
    defaultValues: {
      subject: "",
      topic: "",
      gradeLevel: "",
      duration: "",
      componentSkillIds: [],
      bestStandardIds: [],
    },
  });

  const generateIdeasMutation = useMutation({
    mutationFn: async (data: ProjectIdeaForm) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/projects/generate-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to generate project ideas');
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedIdeas(data.ideas || []);
      toast({
        title: "Ideas Generated!",
        description: `Generated ${data.ideas?.length || 0} project ideas based on your criteria.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate project ideas. Please try again.",
        variant: "destructive",
      });
    },
  });

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

    // Update form value
    const currentSkills = form.getValues("componentSkillIds");
    const newSkills = selectedSkills.has(skillId)
      ? currentSkills.filter(id => id !== skillId)
      : [...currentSkills, skillId];
    form.setValue("componentSkillIds", newSkills);
  };

  // Check if all skills in a competency are selected
  const isCompetencyFullySelected = (competency: Competency) => {
    return competency.componentSkills.every(skill => selectedSkills.has(skill.id));
  };

  // B.E.S.T. Standards helper function
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

    // Update form value
    const currentStandards = form.getValues("bestStandardIds") || [];
    const newStandards = selectedStandards.has(standardId)
      ? currentStandards.filter(id => id !== standardId)
      : [...currentStandards, standardId];
    form.setValue("bestStandardIds", newStandards);
  };

  // Toggle all skills in a competency
  const toggleCompetencySelection = (competency: Competency) => {
    const allSelected = isCompetencyFullySelected(competency);
    const currentSkills = form.getValues("componentSkillIds");
    let newSkills = [...currentSkills];

    setSelectedSkills(prev => {
      const newSet = new Set(prev);
      competency.componentSkills.forEach(skill => {
        if (allSelected) {
          newSet.delete(skill.id);
          newSkills = newSkills.filter(id => id !== skill.id);
        } else {
          newSet.add(skill.id);
          if (!newSkills.includes(skill.id)) {
            newSkills.push(skill.id);
          }
        }
      });
      return newSet;
    });

    form.setValue("componentSkillIds", newSkills);
  };

  const onSubmit = (data: ProjectIdeaForm) => {
    // Validate that at least one component skill or B.E.S.T. standard is selected
    if (selectedSkills.size === 0 && selectedStandards.size === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one component skill or B.E.S.T. standard.",
        variant: "destructive",
      });
      return;
    }

    // Ensure bestStandardIds is synced with selectedStandards state
    const submitData = {
      ...data,
      bestStandardIds: Array.from(selectedStandards),
    };
    generateIdeasMutation.mutate(submitData);
  };

  const handleSelectIdea = (idea: ProjectIdea) => {
    setSelectedIdea(idea);
    if (onSelectIdea) {
      // Pass the idea data along with the selected component skills and form data
      const formValues = form.getValues();
      onSelectIdea({
        ...idea,
        selectedComponentSkillIds: Array.from(selectedSkills),
        subject: formValues.subject,
        topic: formValues.topic
      });
    }
    toast({
      title: "Project Idea Selected",
      description: "You can now create a project based on this idea.",
    });
    onClose();
  };

  const handleClose = () => {
    setGeneratedIdeas([]);
    setSelectedIdea(null);
    setSelectedSkills(new Set());
    setSelectedStandards(new Set());
    setExpandedOutcomes(new Set());
    setExpandedCompetencies(new Set());
    setActiveTab('skills');
    setStandardsSearchTerm('');
    setSelectedSubject('');
    setSelectedGrade('');
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center">
            <Lightbulb className="mr-3 h-6 w-6 text-yellow-500" />
            Project Ideas Generator
          </DialogTitle>
          <p className="text-gray-600">
            Generate creative project ideas based on your teaching goals and student needs
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Target className="mr-2 h-5 w-5 text-blue-600" />
                  Project Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Area *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Science, History, Mathematics, English"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topic or Theme *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Climate Change, Ancient Civilizations, Space Exploration"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gradeLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade Level *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="9-10">High School (9-10)</SelectItem>
                              <SelectItem value="11-12">High School (11-12)</SelectItem>
                              <SelectItem value="mixed">Mixed Grade Levels</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Duration *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                              <SelectItem value="3-4 weeks">3-4 weeks</SelectItem>
                              <SelectItem value="5-8 weeks">5-8 weeks (quarter)</SelectItem>
                              <SelectItem value="9-18 weeks">9-18 weeks (semester)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <div className="text-base font-medium">Select Skills & Standards *</div>
                      <p className="text-sm text-gray-600">
                        Choose component skills and/or B.E.S.T. standards for project generation
                      </p>
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="skills">Component Skills</TabsTrigger>
                          <TabsTrigger value="standards">B.E.S.T. Standards</TabsTrigger>
                        </TabsList>

                        <TabsContent value="skills" className="space-y-3">
                          <FormField
                            control={form.control}
                            name="componentSkillIds"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  {isLoading ? (
                                    <div className="flex items-center justify-center h-32 border rounded-md">
                                      <div className="text-muted-foreground">Loading competency framework...</div>
                                    </div>
                                  ) : (
                                    <ScrollArea className="h-64 border rounded-md p-4">
                                      <div className="space-y-2">
                                        {hierarchyData?.map((outcome: LearnerOutcome) => (
                                          <div key={outcome.id} className="border border-gray-200 rounded-lg">
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

                                            {expandedOutcomes.has(outcome.id) && (
                                              <div className="border-t border-gray-200">
                                                {outcome.competencies.map((competency: Competency) => (
                                                  <div key={competency.id} className="border-b border-gray-100 last:border-b-0">
                                                    <div className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100">
                                                      <div
                                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                                        onClick={() => {
                                                          toggleCompetencyExpansion(competency.id);
                                                        }}
                                                      >
                                                        {expandedCompetencies.has(competency.id) ? (
                                                          <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                          <ChevronRight className="h-4 w-4" />
                                                        )}
                                                        <span className="font-medium">{competency.name}</span>
                                                        <span className="text-sm text-gray-600">
                                                          ({competency.componentSkills?.length || 0} skills)
                                                        </span>
                                                      </div>
                                                      <Checkbox
                                                        checked={isCompetencyFullySelected(competency)}
                                                        onCheckedChange={() => toggleCompetencySelection(competency)}
                                                      />
                                                    </div>

                                                    {expandedCompetencies.has(competency.id) && (
                                                      <div className="pl-6 pr-3 pb-2 bg-yellow-50 border-l-2 border-yellow-200">
                                                        <div className="text-xs text-yellow-700 mb-2 font-medium">
                                                          Component Skills ({competency.componentSkills?.length || 0}):
                                                        </div>
                                                        {competency.componentSkills && competency.componentSkills.length > 0 ? (
                                                          competency.componentSkills.map((skill: ComponentSkill) => (
                                                            <div key={skill.id} className="flex items-center gap-2 py-2 bg-white rounded px-2 mb-1">
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
                                                          <div className="text-sm text-red-500 py-2 bg-red-50 rounded px-2">
                                                            No component skills found for this competency
                                                          </div>
                                                        )}
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
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>

                        <TabsContent value="standards" className="space-y-3">
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

                          {isLoadingStandards ? (
                            <div className="flex items-center justify-center h-48">
                              <div className="text-muted-foreground">Loading B.E.S.T. standards...</div>
                            </div>
                          ) : standardsError ? (
                            <div className="flex items-center justify-center h-48">
                              <div className="text-red-500">Error loading B.E.S.T. standards. Please check your search criteria.</div>
                            </div>
                          ) : (
                            <div className="max-h-[250px] overflow-y-auto border rounded-md p-4">
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

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={generateIdeasMutation.isPending || (selectedSkills.size === 0 && selectedStandards.size === 0)}
                    >
                      {generateIdeasMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Ideas...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Project Ideas
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Generated Ideas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Ideas</h3>
              {generatedIdeas.length > 0 && (
                <Badge variant="secondary">
                  {generatedIdeas.length} ideas
                </Badge>
              )}
            </div>

            {generateIdeasMutation.isPending && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
                  <p className="text-gray-600">Generating creative project ideas...</p>
                </CardContent>
              </Card>
            )}

            {generatedIdeas.length === 0 && !generateIdeasMutation.isPending && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Ready to Generate Ideas
                  </h4>
                  <p className="text-gray-600">
                    Fill in the criteria and click "Generate Project Ideas" to get AI-powered suggestions.
                  </p>
                </CardContent>
              </Card>
            )}

            {generatedIdeas.map((idea, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-blue-900">{idea.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{idea.overview}</p>
                    </div>
                    <Button
                      onClick={() => handleSelectIdea(idea)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 ml-4"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Use This Idea
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-2">Description</h5>
                    <p className="text-sm text-gray-700">{idea.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-orange-600" />
                        Key Milestones
                      </h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {idea.suggestedMilestones?.slice(0, 3).map((milestone, idx) => (
                          <li key={idx} className="flex items-start">
                            <CheckCircle className="h-3 w-3 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            {milestone.title}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-1 text-purple-600" />
                        Learning Outcomes
                      </h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {idea.learningOutcomes?.slice(0, 3).map((outcome, idx) => (
                          <li key={idx} className="flex items-start">
                            <Target className="h-3 w-3 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {idea.requiredResources && idea.requiredResources.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Required Resources</h5>
                      <div className="flex flex-wrap gap-1">
                        {idea.requiredResources.slice(0, 5).map((resource, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {resource}
                          </Badge>
                        ))}
                        {idea.requiredResources.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{idea.requiredResources.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}