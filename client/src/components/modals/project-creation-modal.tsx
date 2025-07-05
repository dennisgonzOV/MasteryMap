import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Sparkles, Loader2 } from "lucide-react";

const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  learnerOutcomes: z.array(z.object({
    outcomeId: z.number(),
    competencyIds: z.array(z.number()).min(1, "At least one competency is required for each outcome"),
  })).min(1, "At least one learner outcome is required"),
  dueDate: z.string().optional(),
});

interface ProjectCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectId: number) => void;
}

export default function ProjectCreationModal({
  open,
  onOpenChange,
  onProjectCreated
}: ProjectCreationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);

  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      learnerOutcomes: [],
      dueDate: "",
    },
  });

  // Fetch learner outcomes with their competencies
  const { data: learnerOutcomes = [], isLoading: learnerOutcomesLoading } = useQuery({
    queryKey: ["/api/learner-outcomes"],
    queryFn: api.getLearnerOutcomes,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: (project) => {
      toast({
        title: "Project Created",
        description: "Your project has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onProjectCreated?.(project.id);
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate milestones mutation
  const generateMilestonesMutation = useMutation({
    mutationFn: (projectId: number) => api.generateMilestones(projectId),
    onSuccess: () => {
      toast({
        title: "Milestones Generated",
        description: "AI-powered milestones have been generated for your project.",
      });
      setIsGeneratingMilestones(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate milestones. You can add them manually.",
        variant: "destructive",
      });
      setIsGeneratingMilestones(false);
    },
  });

  const onSubmit = async (data: z.infer<typeof projectSchema>) => {
    // Extract all competency IDs for legacy compatibility
    const allCompetencyIds = Array.from(new Set(
      data.learnerOutcomes.flatMap(outcome => outcome.competencyIds)
    ));

    const projectData = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate || undefined,
      status: "draft",
      competencyIds: allCompetencyIds, // Legacy support
      learnerOutcomes: data.learnerOutcomes, // New structure
    };

    const project = await createProjectMutation.mutateAsync(projectData);
    console.log('Project created:', project);

    // Generate milestones if requested
    if (isGeneratingMilestones && project && project.id) {
      console.log('Generating milestones for project:', project.id);
      generateMilestonesMutation.mutate(project.id);
    }
  };

  const handleGenerateMilestones = async () => {
    try {
      setIsGeneratingMilestones(true);
      const isValid = await form.trigger();
      if (!isValid) {
        setIsGeneratingMilestones(false);
        return;
      }
      
      const formData = form.getValues();
      const projectData = {
        ...formData,
        dueDate: formData.dueDate || undefined,
        status: "draft",
      };

      console.log('Creating project with data:', projectData);
      const project = await createProjectMutation.mutateAsync(projectData);
      console.log('Project created:', project);

      if (project && project.id) {
        console.log('Generating milestones for project:', project.id);
        await generateMilestonesMutation.mutateAsync(project.id);
        
        // Close modal and refresh projects
        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        form.reset();
        setIsGeneratingMilestones(false);
      } else {
        console.error('Project creation failed or no ID returned:', project);
        setIsGeneratingMilestones(false);
      }
    } catch (error) {
      console.error('Error in handleGenerateMilestones:', error);
      setIsGeneratingMilestones(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Create New Project
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter project title"
                      {...field}
                      className="focus-ring"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your project..."
                      rows={4}
                      {...field}
                      className="focus-ring"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="focus-ring"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="learnerOutcomes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>XQ Learner Outcomes & Competencies</FormLabel>
                  <FormControl>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {learnerOutcomesLoading ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Loading learner outcomes...</p>
                        </div>
                      ) : (
                        learnerOutcomes.map((outcome) => {
                          const isOutcomeSelected = field.value.some(item => item.outcomeId === outcome.id);
                          const selectedOutcome = field.value.find(item => item.outcomeId === outcome.id);
                          
                          return (
                            <div key={outcome.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-start space-x-2">
                                <Checkbox
                                  id={`outcome-${outcome.id}`}
                                  checked={isOutcomeSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      // Add outcome with the competency it belongs to selected by default
                                      field.onChange([...field.value, {
                                        outcomeId: outcome.id,
                                        competencyIds: [outcome.competency.id]
                                      }]);
                                    } else {
                                      // Remove outcome
                                      field.onChange(field.value.filter(item => item.outcomeId !== outcome.id));
                                    }
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <Label
                                    htmlFor={`outcome-${outcome.id}`}
                                    className="text-sm font-medium cursor-pointer block"
                                  >
                                    {outcome.name}
                                  </Label>
                                  <p className="text-xs text-gray-600 mt-1">{outcome.description}</p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    From: {outcome.competency.name} ({outcome.competency.category})
                                  </p>
                                </div>
                              </div>
                              
                              {isOutcomeSelected && (
                                <div className="ml-6 mt-2 p-2 bg-gray-50 rounded">
                                  <p className="text-xs font-medium text-gray-700 mb-2">
                                    Available Competencies for this Outcome:
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`competency-${outcome.competency.id}-for-outcome-${outcome.id}`}
                                      checked={selectedOutcome?.competencyIds.includes(outcome.competency.id) || false}
                                      onCheckedChange={(checked) => {
                                        const updatedOutcomes = field.value.map(item => {
                                          if (item.outcomeId === outcome.id) {
                                            if (checked) {
                                              return {
                                                ...item,
                                                competencyIds: [...new Set([...item.competencyIds, outcome.competency.id])]
                                              };
                                            } else {
                                              return {
                                                ...item,
                                                competencyIds: item.competencyIds.filter(id => id !== outcome.competency.id)
                                              };
                                            }
                                          }
                                          return item;
                                        });
                                        field.onChange(updatedOutcomes);
                                      }}
                                    />
                                    <Label
                                      htmlFor={`competency-${outcome.competency.id}-for-outcome-${outcome.id}`}
                                      className="text-xs cursor-pointer"
                                    >
                                      {outcome.competency.name}
                                    </Label>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex items-center space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createProjectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                {createProjectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Project
              </Button>
              <Button
                type="button"
                onClick={handleGenerateMilestones}
                disabled={createProjectMutation.isPending || generateMilestonesMutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700 btn-primary"
              >
                {createProjectMutation.isPending || generateMilestonesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Milestones
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
