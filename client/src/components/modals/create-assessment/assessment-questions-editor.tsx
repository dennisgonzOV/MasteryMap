import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleHelp, Plus, Trash2, X } from "lucide-react";
import type { AssessmentForm } from "./assessment-form";

interface AssessmentQuestionsEditorProps {
  form: UseFormReturn<AssessmentForm>;
  questionFields: FieldArrayWithId<AssessmentForm, "questions", "id">[];
  onAddQuestion: () => void;
  onRemoveQuestion: (index: number) => void;
  onAddMultipleChoiceOption: (questionIndex: number) => void;
  onRemoveMultipleChoiceOption: (questionIndex: number, optionIndex: number) => void;
  disableMultipleChoice?: boolean;
}

export function AssessmentQuestionsEditor({
  form,
  questionFields,
  onAddQuestion,
  onRemoveQuestion,
  onAddMultipleChoiceOption,
  onRemoveMultipleChoiceOption,
  disableMultipleChoice = false,
}: AssessmentQuestionsEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Assessment Questions</Label>
        <Button
          type="button"
          onClick={onAddQuestion}
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
                  onClick={() => onRemoveQuestion(index)}
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
                  <FormLabel className="flex items-center gap-2">
                    <span>Question Type</span>
                    {disableMultipleChoice && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-gray-500 hover:text-gray-700">
                            <CircleHelp className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Multiple Choice is disabled when assessing multiple component skills because a single correct answer may not represent multiple competencies.
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="focus-ring">
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="open-ended">Open-ended</SelectItem>
                      <SelectItem value="multiple-choice" disabled={disableMultipleChoice}>
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value="short-answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch(`questions.${index}.type`) === "multiple-choice" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Answer Options</Label>
                  <Button
                    type="button"
                    onClick={() => onAddMultipleChoiceOption(index)}
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
                      onClick={() => onRemoveMultipleChoiceOption(index, optionIndex)}
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
  );
}
