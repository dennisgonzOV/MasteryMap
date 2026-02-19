import { useState, useEffect } from "react";
import type { DragEvent } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, X, Sparkles, Brain, FileText, Upload } from "lucide-react";
import type {
  LearnerOutcomeHierarchyItemDTO,
} from "@shared/contracts/api";
import { AssessmentCompetencySelector } from "@/components/modals/create-assessment/assessment-competency-selector";
import { AssessmentQuestionsEditor } from "@/components/modals/create-assessment/assessment-questions-editor";
import {
  assessmentSchema,
  collectSelectedSkills,
  type AssessmentForm,
} from "@/components/modals/create-assessment/assessment-form";
import { useAssessmentAiGeneration } from "@/components/modals/create-assessment/use-assessment-ai-generation";

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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfObjectPath, setPdfObjectPath] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const form = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    mode: "onBlur",
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
  }, [assessmentType, form]);

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Fetch the complete hierarchy
  const { data: hierarchy = [], isLoading: hierarchyLoading } = useQuery<LearnerOutcomeHierarchyItemDTO[]>({
    queryKey: ["/api/competencies/learner-outcomes-hierarchy/complete"],
    queryFn: api.getLearnerOutcomesHierarchyComplete,
    enabled: open,
  });

  const {
    aiQuestionCount,
    aiQuestionTypes,
    generateWithAI,
    isGeneratingWithAI,
    setAiQuestionCount,
    setAiQuestionTypes,
  } = useAssessmentAiGeneration({
    form,
    hierarchy,
    pdfObjectPath,
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentForm) => {
      return api.createAssessment(data);
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
      setPdfFile(null);
      setPdfObjectPath(null);
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
    const submissionData = {
      ...data,
      questions: data.assessmentType === "teacher" ? data.questions : undefined,
      pdfUrl: pdfObjectPath || undefined,
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

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "PDF must be under 20MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPdf(true);
    setPdfFile(file);
    try {
      const { objectPath } = await api.uploadFile(file);

      setPdfObjectPath(objectPath);
      toast({
        title: "PDF Uploaded",
        description: `"${file.name}" uploaded successfully. It will be used for AI generation and grading.`,
      });
    } catch (error) {
      console.error('PDF upload error:', error);
      setPdfFile(null);
      setPdfObjectPath(null);
      toast({
        title: "Upload Failed",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfObjectPath(null);
  };

  const handlePdfDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!isUploadingPdf) {
      setIsDragActive(true);
    }
  };

  const handlePdfDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handlePdfDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (isUploadingPdf) {
      return;
    }

    const droppedFiles = Array.from(event.dataTransfer.files || []);
    const pdfFromDrop = droppedFiles.find((file) => file.type === "application/pdf");
    const fileToUpload = pdfFromDrop ?? droppedFiles[0];

    if (fileToUpload) {
      void handlePdfUpload(fileToUpload);
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
                    <AssessmentCompetencySelector
                      hierarchy={hierarchy}
                      hierarchyLoading={hierarchyLoading}
                      assessmentType={assessmentType}
                      selectedSkillIds={field.value || []}
                      expandedOutcomes={expandedOutcomes}
                      expandedCompetencies={expandedCompetencies}
                      onToggleOutcome={toggleOutcome}
                      onToggleCompetency={toggleCompetency}
                      onTeacherSkillToggle={handleComponentSkillChange}
                      onSelfEvaluationSkillSelect={(skillId) => form.setValue("componentSkillIds", [skillId])}
                    />
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
                        {collectSelectedSkills(hierarchy, selectedSkills).map((skill) => (
                          <div key={skill.id} className="text-xs text-green-700 flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            {skill.name}
                          </div>
                        ))}
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

            {/* PDF Upload Section - Available for Teacher Assessments and Self-Evaluations */}
            {(assessmentType === "teacher" || assessmentType === "self-evaluation") && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-900">Reading Material (PDF)</p>
                    <p className="text-sm text-purple-700">
                      {assessmentType === "teacher"
                        ? "Optionally upload a PDF document (e.g. a reading assignment). The AI will use it to generate questions and grade responses."
                        : "Optionally upload a PDF document (e.g. reading material). The AI tutor will use it during the self-assessment conversation."}
                    </p>
                  </div>
                </div>

                {!pdfFile ? (
                  <label
                    className={`flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg transition-colors ${
                      isUploadingPdf
                        ? "cursor-not-allowed border-purple-200 bg-purple-50/60"
                        : isDragActive
                          ? "cursor-pointer border-purple-500 bg-purple-100"
                          : "cursor-pointer border-purple-300 hover:bg-purple-100"
                    }`}
                    onDragOver={handlePdfDragOver}
                    onDragEnter={handlePdfDragOver}
                    onDragLeave={handlePdfDragLeave}
                    onDrop={handlePdfDrop}
                  >
                    <div className="flex flex-col items-center">
                      <Upload className="h-6 w-6 text-purple-400 mb-1" />
                      <span className="text-sm text-purple-600">Drag and drop a PDF here, or click to upload (max 20MB)</span>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                        e.target.value = '';
                      }}
                      disabled={isUploadingPdf}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{pdfFile.name}</p>
                        <p className="text-xs text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      {isUploadingPdf && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
                      {pdfObjectPath && <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">Uploaded</Badge>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removePdf}
                      disabled={isUploadingPdf}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* AI Generation Section - Only for Teacher Assessments */}
            {assessmentType === "teacher" && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                <div className="flex items-center space-x-3">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">AI-Powered Assessment Generation</p>
                    <p className="text-sm text-blue-700">
                      Generate questions automatically based on selected component skills
                      {pdfObjectPath && " and uploaded PDF"}
                    </p>
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
              <AssessmentQuestionsEditor
                form={form}
                questionFields={questionFields}
                onAddQuestion={addQuestion}
                onRemoveQuestion={removeQuestion}
                onAddMultipleChoiceOption={addMultipleChoiceOption}
                onRemoveMultipleChoiceOption={removeMultipleChoiceOption}
              />
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
