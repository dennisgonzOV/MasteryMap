import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

// Enhanced schema with multiple choice options and self-evaluation support
const assessmentSchema = z.object({
  title: z.string().min(1, "Assessment title is required"),
  description: z.string().min(1, "Assessment description is required"),
  dueDate: z.string().min(1, "Due date is required").refine(
    (date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      return selectedDate >= today;
    },
    {
      message: "Due date must be today or in the future",
    }
  ),
  componentSkillIds: z.array(z.number()).min(1, "At least one component skill must be selected"),
  assessmentType: z.enum(["teacher", "self-evaluation"]).default("teacher"),
  allowSelfEvaluation: z.boolean().default(false),
  questions: z.array(z.object({
    text: z.string().min(1, "Question text is required"),
    type: z.enum(["open-ended", "multiple-choice", "short-answer"]),
    rubricCriteria: z.string().optional(),
    options: z.array(z.string()).optional(), // For multiple choice
    correctAnswer: z.string().optional(), // For multiple choice
  })).optional(),
}).refine((data) => {
  if (data.assessmentType === "teacher") {
    return data.questions && data.questions.length > 0 && data.questions.every(q => q.text.trim().length > 0);
  }
  return true;
}, {
  message: "Questions are required for teacher assessments",
  path: ["questions"]
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
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiQuestionTypes, setAiQuestionTypes] = useState({
    "open-ended": true,
    "multiple-choice": true,
    "short-answer": false
  });

  const form = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      componentSkillIds: [],
      assessmentType: "teacher",
      allowSelfEvaluation: false,
      questions: [{
        text: "",
        type: "open-ended",
        rubricCriteria: "",
        options: [],
        correctAnswer: ""
      }],
    },
  });

  // Watch assessment type to show/hide sections
  const assessmentType = form.watch("assessmentType");
  const selectedSkills = form.watch("componentSkillIds");

  // Handle assessment type changes
  useEffect(() => {
    if (assessmentType === "self-evaluation") {
      // Clear questions for self-evaluation
      form.setValue("questions", []);
    } else if (assessmentType === "teacher") {
      // Ensure at least one question exists for teacher assessment
      const currentQuestions = form.getValues("questions");
      if (!currentQuestions || currentQuestions.length === 0) {
        form.setValue("questions", [{
          text: "",
          type: "open-ended",
          rubricCriteria: "",
          options: [],
          correctAnswer: ""
        }]);
      }
    }
    // Trigger validation after changing questions
    form.trigger();
  }, [assessmentType, form]);

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Fetch the complete hierarchy
  const { data: hierarchy = [], isLoading: hierarchyLoading } = useQuery({
    queryKey: ["/api/competencies/learner-outcomes-hierarchy/complete"],
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

    // For self-evaluation assessments, we don't need questions
    const submissionData = {
      ...data,
      questions: data.assessmentType === "teacher" ? data.questions : undefined,
    };

    createAssessmentMutation.mutate(submissionData);
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
    // Trigger form validation to update the button state
    form.trigger("componentSkillIds");
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

    // Get AI generation preferences from state
    const selectedTypes = Object.entries(aiQuestionTypes)
      .filter(([_, isSelected]) => isSelected)
      .map(([type, _]) => type);

    if (selectedTypes.length === 0) {
      toast({
        title: "Select Question Types",
        description: "Please select at least one question type for AI generation.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingWithAI(true);
    try {
      // Mock AI generation for now - you can replace this with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      // Generate sample questions based on preferences
      const questionTemplates = {
        "open-ended": [
          {
            text: "Describe how you would collaborate effectively with team members from different backgrounds.",
            type: "open-ended" as const,
            rubricCriteria: "Look for evidence of cultural awareness, communication strategies, and inclusive practices.",
          },
          {
            text: "Explain how you would approach solving a complex problem in your field.",
            type: "open-ended" as const,
            rubricCriteria: "Assess problem-solving methodology, critical thinking, and systematic approach.",
          },
          {
            text: "Discuss the importance of ethical considerations in your work.",
            type: "open-ended" as const,
            rubricCriteria: "Evaluate understanding of ethics, moral reasoning, and professional responsibility.",
          }
        ],
        "multiple-choice": [
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
          },
          {
            text: "What is the most important factor in successful teamwork?",
            type: "multiple-choice" as const,
            options: [
              "Having similar personalities",
              "Clear communication and shared goals",
              "Working independently",
              "Avoiding conflict at all costs"
            ],
            correctAnswer: "Clear communication and shared goals",
            rubricCriteria: "Evaluates understanding of collaborative principles.",
          }
        ],
        "short-answer": [
          {
            text: "List three key strategies for effective time management.",
            type: "short-answer" as const,
            rubricCriteria: "Look for practical, actionable strategies and understanding of time management principles.",
          },
          {
            text: "What are two main benefits of diverse perspectives in problem-solving?",
            type: "short-answer" as const,
            rubricCriteria: "Assess understanding of diversity's value and its impact on outcomes.",
          }
        ]
      };

      // Validate selectedTypes is not empty to prevent infinite loop
      if (selectedTypes.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one question type before generating.",
          variant: "destructive",
        });
        return;
      }

      // Generate questions based on selected types and count
      const generatedQuestions = [];
      const questionsPerType = Math.ceil(aiQuestionCount / selectedTypes.length);

      for (const type of selectedTypes) {
        const templates = questionTemplates[type as keyof typeof questionTemplates];
        const questionsToAdd = Math.min(questionsPerType, templates.length);

        // Add questions from this type's templates, cycling through if needed
        for (let i = 0; i < questionsToAdd && generatedQuestions.length < aiQuestionCount; i++) {
          const templateIndex = i % templates.length; // Cycle through templates if we need more questions
          generatedQuestions.push({
            ...templates[templateIndex],
            text: `${templates[templateIndex].text} (Question ${generatedQuestions.length + 1})`
          });
        }
      }

      // If we still need more questions, cycle through all types again
      while (generatedQuestions.length < aiQuestionCount) {
        for (const type of selectedTypes) {
          if (generatedQuestions.length >= aiQuestionCount) break;

          const templates = questionTemplates[type as keyof typeof questionTemplates];
          const templateIndex = generatedQuestions.length % templates.length;
          generatedQuestions.push({
            ...templates[templateIndex],
            text: `${templates[templateIndex].text} (Question ${generatedQuestions.length + 1})`
          });
        }
      }

      // Ensure we have exactly the requested count
      const finalQuestions = generatedQuestions.slice(0, aiQuestionCount);

      form.setValue("questions", finalQuestions);

      toast({
        title: "AI Assessment Generated",
        description: `Generated ${finalQuestions.length} questions based on your preferences. You can review and edit them.`,
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
                        min={new Date().toISOString().split('T')[0]}
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

            {/* Assessment Type Selection */}
            <FormField
              control={form.control}
              name="assessmentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-medium">Assessment Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="teacher" id="teacher" />
                        <Label htmlFor="teacher" className="cursor-pointer">
                          Teacher Assessment - Students complete questions you create
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self-evaluation" id="self-evaluation" />
                        <Label htmlFor="self-evaluation" className="cursor-pointer">
                          Self-Evaluation - Students evaluate their own competency level with AI guidance
                        </Label>
                      </div>
                    </RadioGroup>
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
                                            <div key={`skill-${skill.id}`} className="flex items-start space-x-2 py-1">
                                              {assessmentType === "self-evaluation" ? (
                                                <>
                                                  <input
                                                    type="radio"
                                                    id={`skill-${skill.id}`}
                                                    name="componentSkill"
                                                    checked={field.value?.includes(skill.id)}
                                                    onChange={() => {
                                                      // For self-evaluation, only allow one selection
                                                      form.setValue("componentSkillIds", [skill.id]);
                                                      form.trigger("componentSkillIds");
                                                    }}
                                                    className="mt-0.5"
                                                  />
                                                  <label
                                                    htmlFor={`skill-${skill.id}`}
                                                    className="text-xs text-gray-600 cursor-pointer leading-tight"
                                                  >
                                                    {skill.name}
                                                  </label>
                                                </>
                                              ) : (
                                                <>
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
                                                </>
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
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Self-Evaluation Information Section */}
            {assessmentType === "self-evaluation" && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg text-green-800 flex items-center">
                    <Brain className="mr-2 h-5 w-5" />
                    Self-Evaluation Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-green-700 space-y-2">
                    <p><strong>How it works:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Students evaluate their own competency level for each selected component skill</li>
                      <li>They choose a rubric level: Emerging → Developing → Proficient → Applying</li>
                      <li>Students provide justification and examples of their work</li>
                      <li>AI provides personalized feedback on how to improve to reach mastery</li>
                      <li>Safety guardrails detect concerning content and notify teachers</li>
                    </ul>
                  </div>

                  {selectedSkills.length > 0 && (
                    <div className="bg-white p-3 rounded border border-green-200">
                      <p className="text-sm font-medium text-green-800 mb-2">
                        Students will self-evaluate on {selectedSkills.length} component skill{selectedSkills.length > 1 ? 's' : ''}:
                      </p>
                      <div className="space-y-1">
                        {hierarchy.flatMap((outcome: any) => 
                          outcome.competencies?.flatMap((competency: any) => 
                            competency.componentSkills?.filter((skill: any) => selectedSkills.includes(skill.id))
                              .map((skill: any) => (
                                <div key={skill.id} className="text-xs text-green-700 flex items-center">
                                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                  {skill.name}
                                </div>
                              ))
                          )
                        ) || []}
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> AI safety checks will flag concerning content (including references to self-harm or violence) and automatically notify you for immediate follow-up.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Generation Section - Only for Teacher Assessments */}
            {assessmentType === "teacher" && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
              <div className="flex items-center space-x-3">
                <Brain className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">AI-Powered Assessment Generation</p>
                  <p className="text-sm text-blue-700">Generate questions automatically based on selected component skills</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Number of Questions */}
                <div>
                  <Label className="text-sm font-medium text-blue-900">Number of Questions</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={aiQuestionCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const clampedValue = Math.min(Math.max(value, 1), 50);
                      setAiQuestionCount(clampedValue);
                    }}
                    className="mt-1 bg-white border-blue-200 focus:border-blue-400"
                  />
                </div>

                {/* Question Types */}
                <div>
                  <Label className="text-sm font-medium text-blue-900 mb-2 block">Question Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={aiQuestionTypes["open-ended"]}
                        onCheckedChange={(checked) => 
                          setAiQuestionTypes(prev => ({ ...prev, "open-ended": checked as boolean }))
                        }
                        className="border-blue-300"
                      />
                      <Label className="text-sm text-blue-800">Open-ended</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={aiQuestionTypes["multiple-choice"]}
                        onCheckedChange={(checked) => 
                          setAiQuestionTypes(prev => ({ ...prev, "multiple-choice": checked as boolean }))
                        }
                        className="border-blue-300"
                      />
                      <Label className="text-sm text-blue-800">Multiple Choice</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={aiQuestionTypes["short-answer"]}
                        onCheckedChange={(checked) => 
                          setAiQuestionTypes(prev => ({ ...prev, "short-answer": checked as boolean }))
                        }
                        className="border-blue-300"
                      />
                      <Label className="text-sm text-blue-800">Short Answer</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={generateWithAI}
                  disabled={isGeneratingWithAI || form.watch("componentSkillIds").length === 0}
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
            </div>
            )}

            {/* Assessment Questions - Only for Teacher Assessments */}
            {assessmentType === "teacher" && (
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
                          <div key={`option-${index}-${optionIndex}`} className="flex items-center space-x-2">
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
                                  {...field}                                  className="focus-ring"
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
            )}

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