import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";

const assessmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  questions: z.array(z.object({
    text: z.string().min(1, "Question text is required"),
    type: z.enum(["open-ended", "multiple-choice", "short-answer"]),
    rubricCriteria: z.string().optional(),
  })).min(1, "At least one question is required"),
});

interface AssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestoneId?: number;
  onAssessmentCreated?: (assessmentId: number) => void;
}

export default function AssessmentModal({
  open,
  onOpenChange,
  milestoneId,
  onAssessmentCreated
}: AssessmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: "",
      description: "",
      questions: [{ text: "", type: "open-ended" as const, rubricCriteria: "" }],
    },
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: (data: any) => api.createAssessment(data),
    onSuccess: (assessment) => {
      toast({
        title: "Assessment Created",
        description: "Your assessment has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      onAssessmentCreated?.(assessment.id);
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate assessment mutation
  const generateAssessmentMutation = useMutation({
    mutationFn: (milestoneId: number) => api.generateAssessment(milestoneId),
    onSuccess: (assessment) => {
      // Pre-fill form with generated assessment
      form.setValue("title", assessment.title);
      form.setValue("description", assessment.description);
      form.setValue("questions", assessment.questions || []);
      setIsGenerating(false);
      toast({
        title: "Assessment Generated",
        description: "AI-powered assessment has been generated. You can review and edit it.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate assessment. Please create it manually.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const onSubmit = async (data: z.infer<typeof assessmentSchema>) => {
    if (!milestoneId) return;

    const assessmentData = {
      ...data,
      milestoneId,
      questions: data.questions.map((q, index) => ({
        ...q,
        id: `q${index + 1}`,
      })),
    };

    createAssessmentMutation.mutate(assessmentData);
  };

  const handleGenerateAssessment = () => {
    if (!milestoneId) return;
    setIsGenerating(true);
    generateAssessmentMutation.mutate(milestoneId);
  };

  const addQuestion = () => {
    const currentQuestions = form.getValues("questions");
    form.setValue("questions", [
      ...currentQuestions,
      { text: "", type: "open-ended" as const, rubricCriteria: "" },
    ]);
  };

  const removeQuestion = (index: number) => {
    const currentQuestions = form.getValues("questions");
    if (currentQuestions.length > 1) {
      form.setValue("questions", currentQuestions.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Create Assessment
          </DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <Button
            onClick={handleGenerateAssessment}
            disabled={isGenerating || !milestoneId}
            className="bg-blue-600 text-white hover:bg-blue-700 btn-primary"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate AI Assessment
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            Generate an assessment automatically based on the milestone, or create one manually below.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter assessment title"
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
                      placeholder="Describe the assessment..."
                      rows={3}
                      {...field}
                      className="focus-ring"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Questions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>

              {form.watch("questions").map((_, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Question {index + 1}</Label>
                    {form.watch("questions").length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name={`questions.${index}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Enter question text..."
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
                    name={`questions.${index}.rubricCriteria`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Rubric Criteria (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="What to look for in responses..."
                            {...field}
                            className="focus-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <DialogFooter className="flex items-center space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createAssessmentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAssessmentMutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700 btn-primary"
              >
                {createAssessmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Assessment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
