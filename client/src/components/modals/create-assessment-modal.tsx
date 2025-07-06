import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, Plus, X, Sparkles, ChevronRight, ChevronDown, Brain, Trash2 } from "lucide-react";

// Enhanced schema with multiple choice options
const assessmentSchema = z.object({
  title: z.string().min(1, "Assessment title is required"),
  description: z.string().min(1, "Assessment description is required"),
  dueDate: z.string().min(1, "Due date is required"),
  componentSkillIds: z.array(z.number()).min(1, "At least one component skill must be selected"),
  questions: z.array(z.object({
    text: z.string().min(1, "Question text is required"),
    type: z.enum(["open-ended", "multiple-choice", "short-answer"]),
    rubricCriteria: z.string().optional(),
    options: z.array(z.string()).optional(), // For multiple choice
    correctAnswer: z.string().optional(), // For multiple choice
  })).min(1, "At least one question is required"),
});

type AssessmentForm = z.infer<typeof assessmentSchema>;

interface CreateAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssessmentCreated?: (assessmentId: number) => void;
}

export default function CreateAssessmentModal({
  open,
  onOpenChange,
  onAssessmentCreated
}: CreateAssessmentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<number>>(new Set());
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<number>>(new Set());
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);

  const form = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      componentSkillIds: [],
      questions: [{
        text: "",
        type: "open-ended",
        rubricCriteria: "",
        options: [],
        correctAnswer: ""
      }],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Fetch the complete hierarchy
  const { data: hierarchy = [], isLoading: hierarchyLoading } = useQuery({
    queryKey: ["/api/learner-outcomes-hierarchy/complete"],
    enabled: open,
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentForm) => {
      const response = await api.createAssessment(data);
      return await response.json();
    },
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
      console.error("Assessment creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssessmentForm) => {
    console.log("Submitting assessment:", data);
    createAssessmentMutation.mutate(data);
  };

  const toggleOutcome = (outcomeId: number) => {
    const newExpanded = new Set(expandedOutcomes);
    if (newExpanded.has(outcomeId)) {
      newExpanded.delete(outcomeId);
    } else {
      newExpanded.add(outcomeId);
    }
    setExpandedOutcomes(newExpanded);
  };

  const toggleCompetency = (competencyId: number) => {
    const newExpanded = new Set(expandedCompetencies);
    if (newExpanded.has(competencyId)) {
      newExpanded.delete(competencyId);
    } else {
      newExpanded.add(competencyId);
    }
    setExpandedCompetencies(newExpanded);
  };

  const handleComponentSkillChange = (skillId: number, checked: boolean) => {
    const currentSkills = form.getValues("componentSkillIds");
    if (checked) {
      form.setValue("componentSkillIds", [...currentSkills, skillId]);
    } else {
      form.setValue("componentSkillIds", currentSkills.filter(id => id !== skillId));
    }
  };

  const addQuestion = () => {
    appendQuestion({
      text: "",
      type: "open-ended",
      rubricCriteria: "",
      options: [],
      correctAnswer: ""
    });
  };

  const addMultipleChoiceOption = (questionIndex: number) => {
    const currentQuestion = form.getValues(`questions.${questionIndex}`);
    const currentOptions = currentQuestion.options || [];
    form.setValue(`questions.${questionIndex}.options`, [...currentOptions, ""]);
  };

  const removeMultipleChoiceOption = (questionIndex: number, optionIndex: number) => {
    const currentQuestion = form.getValues(`questions.${questionIndex}`);
    const currentOptions = currentQuestion.options || [];
    const newOptions = currentOptions.filter((_, index) => index !== optionIndex);
    form.setValue(`questions.${questionIndex}.options`, newOptions);
  };

  const generateWithAI = async () => {
    const selectedSkills = form.getValues("componentSkillIds");
    if (selectedSkills.length === 0) {
      toast({
        title: "Select Component Skills",
        description: "Please select at least one component skill to generate AI assessment.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingWithAI(true);
    try {
      // Mock AI generation for now - you can replace this with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      // Generate sample questions based on selected skills
      const sampleQuestions = [
        {
          text: "Describe how you would collaborate effectively with team members from different backgrounds.",
          type: "open-ended" as const,
          rubricCriteria: "Look for evidence of cultural awareness, communication strategies, and inclusive practices.",
        },
        {
          text: "Which of the following best describes effective cross-cultural communication?",
          type: "multiple-choice" as const,
          options: [
            "Using the same approach with everyone",
            "Adapting communication style to cultural context",
            "Avoiding cultural differences",
            "Speaking louder to overcome barriers"
          ],
          correctAnswer: "Adapting communication style to cultural context",
          rubricCriteria: "Assesses understanding of cultural adaptability in communication.",
        }
      ];

      form.setValue("questions", sampleQuestions);
      
      toast({
        title: "AI Assessment Generated",
        description: "Questions have been generated based on your selected component skills. You can review and edit them.",
      });
    } catch (error) {
      toast({
        title: "AI Generation Failed",
        description: "Unable to generate assessment. Please create questions manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
            Create Assessment
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Component Skills Selection */}
            <FormField
              control={form.control}
              name="componentSkillIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Select Component Skills</FormLabel>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose the specific component skills students will develop in this assessment
                  </p>
                  <FormControl>
                    <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50">
                      {hierarchyLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Loading component skills...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {hierarchy.map((outcome: any) => (
                            <div key={outcome.id} className="bg-white rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() => toggleOutcome(outcome.id)}
                                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  {expandedOutcomes.has(outcome.id) ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                  <span className="font-medium text-gray-900">{outcome.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {outcome.competencies?.length || 0} competencies
                                  </Badge>
                                </div>
                              </button>
                              
                              {expandedOutcomes.has(outcome.id) && (
                                <div className="px-4 pb-3 space-y-2">
                                  {outcome.competencies?.map((competency: any) => (
                                    <div key={competency.id} className="bg-gray-50 rounded-md border">
                                      <button
                                        type="button"
                                        onClick={() => toggleCompetency(competency.id)}
                                        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-100 rounded-md transition-colors"
                                      >
                                        <div className="flex items-center space-x-2">
                                          {expandedCompetencies.has(competency.id) ? (
                                            <ChevronDown className="h-3 w-3 text-gray-400" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3 text-gray-400" />
                                          )}
                                          <span className="text-sm font-medium text-gray-700">{competency.name}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {competency.componentSkills?.length || 0} skills
                                          </Badge>
                                        </div>
                                      </button>
                                      
                                      {expandedCompetencies.has(competency.id) && (
                                        <div className="px-3 pb-2 space-y-1">
                                          {competency.componentSkills?.map((skill: any) => (
                                            <div key={skill.id} className="flex items-start space-x-2 py-1">
                                              <Checkbox
                                                id={`skill-${skill.id}`}
                                                checked={field.value?.includes(skill.id)}
                                                onCheckedChange={(checked) => 
                                                  handleComponentSkillChange(skill.id, checked as boolean)
                                                }
                                                className="mt-0.5"
                                              />
                                              <label
                                                htmlFor={`skill-${skill.id}`}
                                                className="text-xs text-gray-600 cursor-pointer leading-tight"
                                              >
                                                {skill.name}
                                              </label>
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
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* AI Generation Button */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <Brain className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">AI-Powered Assessment Generation</p>
                  <p className="text-sm text-blue-700">Generate questions automatically based on selected component skills</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={generateWithAI}
                disabled={isGeneratingWithAI || form.getValues("componentSkillIds").length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGeneratingWithAI ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>

            {/* Assessment Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Assessment Questions</Label>
                <Button
                  type="button"
                  onClick={addQuestion}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </div>

              {questionFields.map((question, index) => (
                <Card key={question.id} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Question {index + 1}</CardTitle>
                      {questionFields.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`questions.${index}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Text</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your question"
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
                      name={`questions.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="focus-ring">
                                <SelectValue placeholder="Select question type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="open-ended">Open-ended</SelectItem>
                              <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                              <SelectItem value="short-answer">Short Answer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Multiple Choice Options */}
                    {form.watch(`questions.${index}.type`) === "multiple-choice" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Answer Options</Label>
                          <Button
                            type="button"
                            onClick={() => addMultipleChoiceOption(index)}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Option
                          </Button>
                        </div>
                        
                        {(form.watch(`questions.${index}.options`) || []).map((option: string, optionIndex: number) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <Input
                              placeholder={`Option ${optionIndex + 1}`}
                              value={option}
                              onChange={(e) => {
                                const currentOptions = form.getValues(`questions.${index}.options`) || [];
                                const newOptions = [...currentOptions];
                                newOptions[optionIndex] = e.target.value;
                                form.setValue(`questions.${index}.options`, newOptions);
                              }}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              onClick={() => removeMultipleChoiceOption(index, optionIndex)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        <FormField
                          control={form.control}
                          name={`questions.${index}.correctAnswer`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Correct Answer</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter the correct answer"
                                  {...field}
                                  className="focus-ring"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name={`questions.${index}.rubricCriteria`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rubric Criteria (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe how this question will be evaluated"
                              {...field}
                              rows={2}
                              className="focus-ring"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter className="flex items-center space-x-4 pt-6">
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