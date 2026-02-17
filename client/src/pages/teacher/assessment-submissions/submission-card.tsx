import { format } from "date-fns";
import {
  AlertCircle,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  RotateCcw,
  Save,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RUBRIC_LEVELS } from "@/lib/rubric";
import type { ComponentSkillWithDetailsDTO } from "@shared/contracts/api";
import type { AssessmentQuestion, GradingData, RubricLevel, Submission } from "./types";
import { getAverageScore, getSubmissionResponseText, isRubricLevel } from "./utils";

interface SubmissionCardProps {
  submission: Submission;
  assessmentQuestions: AssessmentQuestion[];
  relevantSkills: ComponentSkillWithDetailsDTO[];
  readOnly: boolean;
  gradingData: GradingData;
  isExpanded: boolean;
  isAiGrading: boolean;
  isBulkGrading: boolean;
  isManualGradePending: boolean;
  onAiGrade: (submissionId: number) => void;
  onToggleExpand: (submissionId: number) => void;
  onUpdateGradingData: (submissionId: number, skillId: number, data: {
    rubricLevel: RubricLevel;
    feedback: string;
    score: number;
  }) => void;
  onResetManualGrading: (submissionId: number) => void;
  onSaveManualGrading: (submissionId: number) => void;
}

function getStudentInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getRubricLevelBadge(level?: string | null, showSticker = false) {
  const levelConfig = RUBRIC_LEVELS.find((item) => item.value === level);
  if (!levelConfig) {
    return null;
  }

  return (
    <Badge className={`${levelConfig.color} border`}>
      {levelConfig.label}
      {showSticker && <span className="ml-1">*</span>}
    </Badge>
  );
}

type RubricLevelDetails = Partial<Record<RubricLevel, string>>;

function normalizeRubricLevelDetails(rubricLevels: unknown): RubricLevelDetails {
  if (!rubricLevels || typeof rubricLevels !== "object" || Array.isArray(rubricLevels)) {
    return {};
  }

  return Object.entries(rubricLevels as Record<string, unknown>).reduce<RubricLevelDetails>(
    (accumulator, [key, value]) => {
      if (typeof value !== "string" || !value.trim()) {
        return accumulator;
      }

      const normalizedKey = key.trim().toLowerCase();
      if (isRubricLevel(normalizedKey)) {
        accumulator[normalizedKey] = value.trim();
      }

      return accumulator;
    },
    {}
  );
}

export function SubmissionCard({
  submission,
  assessmentQuestions,
  relevantSkills,
  readOnly,
  gradingData,
  isExpanded,
  isAiGrading,
  isBulkGrading,
  isManualGradePending,
  onAiGrade,
  onToggleExpand,
  onUpdateGradingData,
  onResetManualGrading,
  onSaveManualGrading,
}: SubmissionCardProps) {
  const averageScore = getAverageScore(submission);

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{getStudentInitials(submission.studentName)}</AvatarFallback>
            </Avatar>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">{submission.studentName}</h3>
              <p className="text-sm text-gray-500">{submission.studentUsername}</p>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xs text-gray-500">
                  Submitted: {submission.submittedAt ? format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a") : "Not submitted"}
                </span>
                {submission.isLate && (
                  <Badge variant="destructive" className="text-xs">
                    Late
                  </Badge>
                )}
                {submission.aiGeneratedFeedback && (
                  <Badge className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 flex items-center space-x-1">
                    <Brain className="h-3 w-3" />
                    <span>AI Graded</span>
                  </Badge>
                )}
                {isAiGrading && (
                  <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse flex items-center space-x-1">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce"></div>
                    <span>AI Processing...</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              {averageScore !== null ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-semibold text-green-600">{averageScore}%</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <span className="text-orange-600 font-medium">Ungraded</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {!readOnly && (!submission.grades || submission.grades.length === 0) && !submission.grade && (
                <Button
                  size="sm"
                  onClick={() => onAiGrade(submission.id)}
                  disabled={isAiGrading || isBulkGrading}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md"
                >
                  <Brain className="h-4 w-4" />
                  <span>{isAiGrading ? "AI Grading..." : "Grade with AI"}</span>
                </Button>
              )}

              {!readOnly && ((submission.grades && submission.grades.length > 0) || submission.grade) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAiGrade(submission.id)}
                  disabled={isAiGrading || isBulkGrading}
                  className="flex items-center space-x-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{isAiGrading ? "Re-grading..." : "Re-grade with AI"}</span>
                </Button>
              ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleExpand(submission.id)}
                  className="flex items-center space-x-2"
                >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>{isExpanded ? "Collapse" : readOnly ? "Review Submission" : "Review & Grade"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 bg-gray-50 space-y-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Student Responses</span>
            </h4>

            {assessmentQuestions.map((question, index) => {
              const responseText = getSubmissionResponseText(
                submission.responses,
                question.id ? String(question.id) : undefined,
              );

              return (
                <Card key={question.id ?? `question-${index}`} className="bg-white">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 mb-2">{question.text}</h5>
                        {question.rubricCriteria && (
                          <p className="text-sm text-gray-600 mb-3">
                            <strong>Rubric:</strong> {question.rubricCriteria}
                          </p>
                        )}
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <p className="text-gray-800 whitespace-pre-wrap break-words">{responseText}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {submission.grade !== undefined && submission.aiGeneratedFeedback && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span>AI Assessment Results</span>
              </h4>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="font-medium text-gray-900">Overall Grade</h6>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-lg px-3 py-1">
                      {submission.grade}%
                    </Badge>
                  </div>
                  {submission.feedback && (
                    <div className="bg-white p-4 rounded border border-blue-200">
                      <h6 className="font-medium text-gray-900 mb-2">AI Feedback</h6>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {submission.grades && submission.grades.length > 0 && submission.aiGeneratedFeedback && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span>AI Component Skill Assessment</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submission.grades.map((grade) => {
                  const skill = relevantSkills.find((item) => item.id === grade.componentSkillId);

                  return (
                    <Card key={grade.id} className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h6 className="font-medium text-gray-900">{skill?.name}</h6>
                          {getRubricLevelBadge(grade.rubricLevel, true)}
                        </div>
                        <div className="space-y-2">
                          <div className="text-lg font-semibold text-blue-800">Score: {grade.score}/4</div>
                          {grade.feedback && (
                            <div className="bg-white p-3 rounded border border-blue-200">
                              <p className="text-sm text-gray-700">{grade.feedback}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {submission.grades && submission.grades.length > 0 && !submission.aiGeneratedFeedback && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Manual Grades</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submission.grades.map((grade) => {
                  const skill = relevantSkills.find((item) => item.id === grade.componentSkillId);

                  return (
                    <Card key={grade.id} className="bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h6 className="font-medium text-gray-900">{skill?.name}</h6>
                          {getRubricLevelBadge(grade.rubricLevel, true)}
                        </div>
                        <div className="space-y-2">
                          <div className="text-lg font-semibold text-gray-900">Score: {grade.score}/4</div>
                          {grade.feedback && (
                            <div className="bg-gray-50 p-3 rounded border">
                              <p className="text-sm text-gray-700">{grade.feedback}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {relevantSkills.length > 0 && !readOnly && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>
                  {submission.grades && submission.grades.length > 0
                    ? (submission.aiGeneratedFeedback ? "Review & Edit AI Grading" : "Edit Manual Grading")
                    : "Manual Grading"}
                </span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relevantSkills.map((skill) => {
                  const skillRubricLevelDetails = normalizeRubricLevelDetails(skill.rubricLevels);
                  return (
                    <Card key={skill.id} className="bg-white">
                      <CardContent className="p-4 space-y-4">
                        <h6 className="font-medium text-gray-900">{skill.name}</h6>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Rubric Level</Label>
                            <Select
                              value={gradingData[submission.id]?.[skill.id]?.rubricLevel || ""}
                              onValueChange={(value) => {
                                if (!isRubricLevel(value)) {
                                  return;
                                }
                                const level = RUBRIC_LEVELS.find((item) => item.value === value);
                                onUpdateGradingData(submission.id, skill.id, {
                                  rubricLevel: value,
                                  score: level?.score || 1,
                                  feedback: gradingData[submission.id]?.[skill.id]?.feedback || "",
                                });
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                {RUBRIC_LEVELS.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>
                                    <div className="flex items-center space-x-2">
                                      <Badge className={level.color}>{level.label}</Badge>
                                      <span className="text-sm">
                                        {skillRubricLevelDetails[level.value] || level.description}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Feedback</Label>
                            <Textarea
                              placeholder="Provide specific feedback for this skill..."
                              value={gradingData[submission.id]?.[skill.id]?.feedback || ""}
                              onChange={(event) => {
                                const current = gradingData[submission.id]?.[skill.id];
                                onUpdateGradingData(submission.id, skill.id, {
                                  rubricLevel: current?.rubricLevel || "emerging",
                                  score: current?.score || 1,
                                  feedback: event.target.value,
                                });
                              }}
                              className="resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => onResetManualGrading(submission.id)}
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </Button>

                <Button
                  onClick={() => onSaveManualGrading(submission.id)}
                  disabled={isManualGradePending}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                  <span>{isManualGradePending ? "Saving..." : "Save Grade"}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
