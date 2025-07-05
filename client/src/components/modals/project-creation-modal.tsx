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
  competencyIds: z.array(z.number()).min(1, "Select at least one competency"),
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
      competencyIds: [],
      dueDate: "",
    },
  });

  // Fetch competencies
  const { data: competencies = [], isLoading: competenciesLoading } = useQuery({
    queryKey: ["/api/competencies"],
    queryFn: api.getCompetencies,
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
    const projectData = {
      ...data,
      dueDate: data.dueDate || undefined,
      status: "draft",
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
              name="competencyIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>XQ Competencies</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-3">
                      {competenciesLoading ? (
                        <div className="col-span-2 text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Loading competencies...</p>
                        </div>
                      ) : (
                        competencies.map((competency) => (
                          <div key={competency.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`competency-${competency.id}`}
                              checked={field.value.includes(competency.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, competency.id]);
                                } else {
                                  field.onChange(
                                    field.value.filter((id) => id !== competency.id)
                                  );
                                }
                              }}
                            />
                            <Label
                              htmlFor={`competency-${competency.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {competency.name}
                            </Label>
                          </div>
                        ))
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
                Generate AI Milestones
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
