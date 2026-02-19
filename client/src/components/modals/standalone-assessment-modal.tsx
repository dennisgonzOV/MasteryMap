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

const assessmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  dueDate: z.string().min(1, "Due date is required"),
  componentSkillIds: z.array(z.number()).min(1, "At least one component skill is required"),
  questions: z.array(z.object({
    text: z.string().min(1, "Question text is required"),
    type: z.enum(["open-ended", "multiple-choice", "short-answer"]),
    rubricCriteria: z.string().optional(),
    sampleAnswer: z.string().optional(),
  })).min(1, "At least one question is required"),
});

type AssessmentFormValues = z.infer<typeof assessmentSchema>;

interface HierarchySkill {
  id: number;
  name: string;
}

interface HierarchyCompetency {
  id: number;
  name: string;
  componentSkills?: HierarchySkill[];
}

interface HierarchyOutcome {
  id: number;
  name: string;
  competencies?: HierarchyCompetency[];
}

interface StandaloneAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssessmentCreated?: () => void;
}

export default function StandaloneAssessmentModal({
  open,
  onOpenChange,
  onAssessmentCreated
}: StandaloneAssessmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      componentSkillIds: [],
      questions: [
        {
          text: "",
          type: "open-ended" as const,
          rubricCriteria: "",
          sampleAnswer: "",
        },
      ],
    },
  });

  // Fetch the complete 3-level hierarchy for component skills selection
  const { data: hierarchyData = [], isLoading: hierarchyLoading } = useQuery<HierarchyOutcome[]>({
    queryKey: ['/api/competencies/learner-outcomes-hierarchy/complete'],
    enabled: open,
    queryFn: api.getLearnerOutcomesHierarchyComplete,
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: api.createAssessment,
    onSuccess: () => {
      toast({
        title: "Assessment Created",
        description: "Your standalone assessment has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      onAssessmentCreated?.();
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

  const onSubmit = async (data: AssessmentFormValues) => {
    const assessmentData = {
      ...data,
      // No milestoneId for standalone assessments
      questions: data.questions.map((q, index) => ({
        ...q,
        id: `q${index + 1}`,
      })),
    };

    createAssessmentMutation.mutate(assessmentData);
  };

  const addQuestion = () => {
    const currentQuestions = form.getValues("questions");
    form.setValue("questions", [
      ...currentQuestions,
      {
        text: "",
        type: "open-ended" as const,
        rubricCriteria: "",
        sampleAnswer: "",
      },
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
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Create Standalone Assessment
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        placeholder="Describe what this assessment measures"
                        {...field}
                        rows={3}
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
                    <FormLabel>Due Date</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="componentSkillIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>XQ Component Skills</FormLabel>
                  <FormControl>
                    <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                      {hierarchyLoading ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Loading component skills...</p>
                        </div>
                      ) : (
                        hierarchyData.map((outcome) => (
                          <div key={outcome.id} className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-700">{outcome.name}</h4>
                            {outcome.competencies?.map((competency) => (
                              <div key={competency.id} className="ml-4 space-y-1">
                                <h5 className="font-medium text-xs text-gray-600">{competency.name}</h5>
                                {competency.componentSkills?.map((skill) => (
                                  <div key={skill.id} className="ml-4 flex items-center space-x-2">
                                    <Checkbox
                                      id={`skill-${skill.id}`}
                                      checked={field.value.includes(skill.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, skill.id]);
                                        } else {
                                          field.onChange(field.value.filter(id => id !== skill.id));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`skill-${skill.id}`} className="text-sm">
                                      {skill.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Assessment Questions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                >
                  Add Question
                </Button>
              </div>

              <FormField
                control={form.control}
                name="questions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="space-y-4">
                        {field.value.map((question, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="font-medium">Question {index + 1}</Label>
                              {field.value.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeQuestion(index)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm">Question Text</Label>
                                <Textarea
                                  placeholder="Enter your question"
                                  value={question.text}
                                  onChange={(e) => {
                                    const newQuestions = [...field.value];
                                    newQuestions[index].text = e.target.value;
                                    field.onChange(newQuestions);
                                  }}
                                  className="focus-ring"
                                />
                              </div>

                              <div>
                                <Label className="text-sm">Question Type</Label>
                                <select
                                  value={question.type}
                                  onChange={(e) => {
                                    const newQuestions = [...field.value];
                                    const nextType = e.target.value as AssessmentFormValues["questions"][number]["type"];
                                    newQuestions[index].type = nextType;
                                    field.onChange(newQuestions);
                                  }}
                                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="open-ended">Open-ended</option>
                                  <option value="multiple-choice">Multiple Choice</option>
                                  <option value="short-answer">Short Answer</option>
                                </select>
                              </div>

                              <div>
                                <Label className="text-sm">Rubric Criteria (Optional)</Label>
                                <Textarea
                                  placeholder="Describe how this question will be evaluated"
                                  value={question.rubricCriteria || ""}
                                  onChange={(e) => {
                                    const newQuestions = [...field.value];
                                    newQuestions[index].rubricCriteria = e.target.value;
                                    field.onChange(newQuestions);
                                  }}
                                  className="focus-ring"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAssessmentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createAssessmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Assessment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
