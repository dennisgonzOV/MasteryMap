import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
  ChevronRight,
  Brain,
  Zap,
  MessageSquare,
  Eye,
  GraduationCap,
} from "lucide-react";
import { format } from "date-fns";
import { useTeacherAccess } from "@/hooks/useRoleBasedAccess";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type {
  AssessmentDTO,
  ComponentSkillWithDetailsDTO,
} from "@shared/contracts/api";
import {
  type AssessmentQuestion,
  type GradingData,
  type RubricLevel,
  type Submission,
} from "./assessment-submissions/types";
import {
  getSubmissionStats,
  isSubmissionGraded,
  parseSkillIds,
  toNumericScore,
} from "./assessment-submissions/utils";
import {
  clearSubmissionGradingData,
  loadGradingData,
  saveGradingData,
} from "./assessment-submissions/grading-storage";
import { SubmissionCard } from "./assessment-submissions/submission-card";

export default function AssessmentSubmissions() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { canAccess } = useTeacherAccess();
  const { toast } = useToast();

  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<number>>(() => new Set());
  const [gradingData, setGradingData] = useState<GradingData>(() => loadGradingData(id));
  const [bulkGradingProgress, setBulkGradingProgress] = useState(0);
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const [isGradingDataInitialized, setIsGradingDataInitialized] = React.useState(false);
  const [aiGradingSubmissions, setAiGradingSubmissions] = useState<Set<number>>(new Set());

  const assessmentId = Number(id);

  const { data: assessment, isLoading: assessmentLoading } = useQuery<AssessmentDTO>({
    queryKey: ["/api/assessments", assessmentId],
    queryFn: () => api.getAssessment(assessmentId),
    enabled: canAccess && !!id,
  });

  const componentSkillIds = React.useMemo(
    () => parseSkillIds(assessment?.componentSkillIds),
    [assessment?.componentSkillIds],
  );

  const { data: submissions = [], refetch: refetchSubmissions } = useQuery<Submission[]>({
    queryKey: ["assessment-submissions", id],
    queryFn: () => api.getAssessmentSubmissions(assessmentId) as Promise<Submission[]>,
    enabled: !!id,
  });

  const { data: componentSkills = [] } = useQuery<ComponentSkillWithDetailsDTO[]>({
    queryKey: ["/api/competencies/component-skills"],
    queryFn: () => api.getComponentSkills(),
    enabled: canAccess,
  });

  const { data: assessmentComponentSkills = [] } = useQuery<ComponentSkillWithDetailsDTO[]>({
    queryKey: ["/api/competencies/component-skills/by-ids", componentSkillIds],
    queryFn: async () => {
      if (!componentSkillIds.length) {
        return [];
      }
      return api.getComponentSkillsByIds(componentSkillIds);
    },
    enabled: canAccess && componentSkillIds.length > 0,
  });

  const relevantSkills = React.useMemo(() => {
    if (assessmentComponentSkills?.length > 0) {
      return assessmentComponentSkills;
    }

    if (!assessment?.componentSkillIds || !componentSkills?.length) {
      return [];
    }

    const skillIds = parseSkillIds(assessment.componentSkillIds);
    return componentSkills.filter((skill) => skillIds.includes(skill.id));
  }, [assessment?.componentSkillIds, componentSkills, assessmentComponentSkills]);

  const initializeGradingData = React.useCallback(() => {
    if (!submissions.length || isGradingDataInitialized) {
      return;
    }

    const savedData = loadGradingData(id);
    const initialData: GradingData = {};

    submissions.forEach((submission) => {
      initialData[submission.id] = {};

      if (submission.grades && submission.grades.length > 0) {
        submission.grades.forEach((grade) => {
          if (grade.componentSkillId == null) {
            return;
          }

          initialData[submission.id][grade.componentSkillId] = {
            rubricLevel: (grade.rubricLevel || "emerging") as RubricLevel,
            feedback: grade.feedback || "",
            score: toNumericScore(grade.score) || 1,
          };
        });
      } else if (savedData[submission.id]) {
        initialData[submission.id] = savedData[submission.id];
      }
    });

    setGradingData((prev) => ({ ...prev, ...initialData }));
    setIsGradingDataInitialized(true);
  }, [submissions, isGradingDataInitialized, id]);

  React.useEffect(() => {
    initializeGradingData();
  }, [initializeGradingData]);

  React.useEffect(() => {
    if (submissions.length > 0 && expandedSubmissions.size === 0) {
      const ungradedSubmissionIds = submissions
        .filter((submission) => !isSubmissionGraded(submission))
        .map((submission) => submission.id);

      if (ungradedSubmissionIds.length > 0) {
        setExpandedSubmissions(new Set(ungradedSubmissionIds));
      }
    }
  }, [submissions, expandedSubmissions.size]);

  const gradeMutation = useMutation({
    mutationFn: async ({
      submissionId,
      grades,
    }: {
      submissionId: number;
      grades: Array<{
        componentSkillId: number;
        rubricLevel: RubricLevel;
        feedback: string;
        score: number;
      }>;
    }) => {
      return api.gradeSubmission(submissionId, { grades, generateAiFeedback: false });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Submission graded successfully" });
      refetchSubmissions();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to grade submission";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const aiGradeMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      setAiGradingSubmissions((prev) => new Set(prev).add(submissionId));
      return api.gradeSubmission(submissionId, { generateAiFeedback: true });
    },
    onSuccess: (_, submissionId) => {
      toast({ title: "Success", description: "AI grading completed" });
      setAiGradingSubmissions((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
      refetchSubmissions();
    },
    onError: (error, submissionId) => {
      const message = error instanceof Error ? error.message : "AI grading failed";
      toast({ title: "Error", description: message, variant: "destructive" });
      setAiGradingSubmissions((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
    },
  });

  const bulkGradeMutation = useMutation({
    mutationFn: async () => {
      setIsBulkGrading(true);
      setBulkGradingProgress(0);

      const ungradedSubmissions = submissions.filter((submission) => !isSubmissionGraded(submission));
      const total = ungradedSubmissions.length;

      const results: Array<{ submissionId: number; success: boolean; error?: string }> = [];
      for (let i = 0; i < ungradedSubmissions.length; i++) {
        const submission = ungradedSubmissions[i];
        try {
          await api.gradeSubmission(submission.id, { generateAiFeedback: true });
          results.push({ submissionId: submission.id, success: true });
        } catch (error) {
          results.push({
            submissionId: submission.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        setBulkGradingProgress(((i + 1) / total) * 100);
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((result) => result.success).length;
      const failureCount = results.filter((result) => !result.success).length;

      if (failureCount > 0) {
        toast({
          title: "Bulk Grading Completed",
          description: `${successCount} submissions graded successfully, ${failureCount} failed`,
          variant: failureCount > successCount ? "destructive" : "default",
        });
      } else {
        toast({ title: "Success", description: "All submissions graded successfully" });
      }
      refetchSubmissions();
    },
    onError: () => {
      toast({ title: "Error", description: "Bulk grading failed", variant: "destructive" });
    },
    onSettled: () => {
      setIsBulkGrading(false);
      setBulkGradingProgress(0);
    },
  });

  const toggleSubmissionExpansion = (submissionId: number) => {
    const expanded = new Set(expandedSubmissions);
    if (expanded.has(submissionId)) {
      expanded.delete(submissionId);
    } else {
      expanded.add(submissionId);
    }
    setExpandedSubmissions(expanded);
  };

  const updateGradingData = (
    submissionId: number,
    skillId: number,
    data: {
      rubricLevel: RubricLevel;
      feedback: string;
      score: number;
    },
  ) => {
    setGradingData((prev) => {
      const next: GradingData = {
        ...prev,
        [submissionId]: {
          ...prev[submissionId],
          [skillId]: data,
        },
      };
      saveGradingData(id, next);
      return next;
    });
  };

  const handleManualGrade = (submissionId: number) => {
    const submissionGrades = gradingData[submissionId];
    if (!submissionGrades) {
      return;
    }

    const grades = Object.entries(submissionGrades).map(([skillId, gradeData]) => ({
      componentSkillId: parseInt(skillId, 10),
      ...gradeData,
    }));

    gradeMutation.mutate({ submissionId, grades });
  };

  const handleResetSubmissionGrading = (submissionId: number) => {
    setGradingData((prev) => {
      const next = { ...prev, [submissionId]: {} };
      saveGradingData(id, next);
      return next;
    });
  };

  React.useEffect(() => {
    if (gradeMutation.isSuccess && gradeMutation.variables?.submissionId) {
      clearSubmissionGradingData(id, gradeMutation.variables.submissionId);
    }
  }, [gradeMutation.isSuccess, gradeMutation.variables, id]);

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You need teacher or admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (assessmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading submissions...</span>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Not Found</h2>
            <p className="text-gray-600 mb-4">
              The assessment you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => setLocation("/teacher/assessments")}>Back to Assessments</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assessmentQuestions = Array.isArray(assessment.questions)
    ? (assessment.questions as AssessmentQuestion[])
    : [];
  const stats = getSubmissionStats(submissions);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => setLocation(`/teacher/assessments/${id}`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Assessment</span>
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Grading: {assessment.title}</h1>
              <p className="text-gray-600 mb-4">{assessment.description}</p>

              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{stats.total} submissions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700">{stats.graded} graded</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-700">{stats.ungraded} pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    Due: {assessment.dueDate ? format(new Date(assessment.dueDate), "MMM d, yyyy h:mm a") : "No due date"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-8 border-gradient-to-r from-blue-200 to-purple-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <Brain className="h-6 w-6" />
              <span className="text-xl">AI-Powered Grading</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Bulk AI Grading</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  Grade all {stats.ungraded} ungraded submissions automatically. AI analyzes responses
                  against rubric criteria and provides personalized feedback.
                </p>

                {isBulkGrading && (
                  <div className="space-y-3">
                    <Progress value={bulkGradingProgress} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">AI grading in progress...</span>
                      <span className="font-medium text-blue-800">{Math.round(bulkGradingProgress)}% Complete</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => bulkGradeMutation.mutate()}
                  disabled={isBulkGrading || stats.ungraded === 0}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  <Brain className="h-4 w-4" />
                  <span>
                    {isBulkGrading
                      ? "Grading in Progress..."
                      : stats.ungraded > 0
                        ? `Grade ${stats.ungraded} Submissions with AI`
                        : "All Submissions Graded"}
                  </span>
                </Button>

                {stats.ungraded === 0 && (
                  <div className="flex items-center justify-center space-x-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>All submissions have been graded</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Individual AI Grading</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  Grade submissions one by one with AI assistance. Review and edit AI-generated
                  grades and feedback before finalizing.
                </p>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>AI analyzes responses against component skills</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Provides rubric-based scoring and feedback</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Fully editable before saving</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Tip:</strong> Use individual AI grading to maintain full control over
                    each assessment while leveraging AI insights.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="font-medium text-gray-900">Quick Actions</h3>
                {stats.ungraded > 0 && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {stats.ungraded} pending
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {stats.ungraded > 0 && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => bulkGradeMutation.mutate()}
                      disabled={isBulkGrading}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Brain className="h-4 w-4" />
                      <span>Grade All with AI</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const allIds = new Set(submissions.map((submission) => submission.id));
                        setExpandedSubmissions(allIds);
                      }}
                      className="flex items-center space-x-2 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>Manual Grade All ({submissions.length})</span>
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const allIds = new Set(submissions.map((submission) => submission.id));
                    setExpandedSubmissions(allIds);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>Expand All</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedSubmissions(new Set())}
                  className="flex items-center space-x-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>Collapse All</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
                <p className="text-gray-500">
                  Students haven't submitted their responses for this assessment yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                assessmentQuestions={assessmentQuestions}
                relevantSkills={relevantSkills}
                gradingData={gradingData}
                isExpanded={expandedSubmissions.has(submission.id)}
                isAiGrading={aiGradingSubmissions.has(submission.id)}
                isBulkGrading={isBulkGrading}
                isManualGradePending={gradeMutation.isPending}
                onAiGrade={(submissionId) => aiGradeMutation.mutate(submissionId)}
                onToggleExpand={toggleSubmissionExpansion}
                onUpdateGradingData={updateGradingData}
                onResetManualGrading={handleResetSubmissionGrading}
                onSaveManualGrading={handleManualGrade}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
