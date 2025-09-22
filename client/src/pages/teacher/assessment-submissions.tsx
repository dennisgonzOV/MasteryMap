import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye,
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  Star,
  Brain,
  Zap,
  MessageSquare,
  Save,
  RotateCcw,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherAccess } from "@/hooks/useRoleBasedAccess";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { queryClient } from "@/lib/queryClient";

interface Assessment {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    rubricCriteria?: string;
  }>;
  componentSkillIds: number[];
}

interface ComponentSkill {
  id: number;
  name: string;
  rubricLevels: {
    emerging: string;
    developing: string;
    proficient: string;
    applying: string;
  };
}

interface Grade {
  id: number;
  componentSkillId: number;
  rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
  score: string;
  feedback: string;
  gradedBy: number;
  gradedAt: string;
}

interface Submission {
  id: number;
  studentId: number;
  studentName: string;
  studentUsername: string;
  submittedAt: string;
  responses: Array<{
    questionId: string;
    answer: string;
  }> | { [questionId: string]: string }; // Adjusted to allow for object format
  grades?: Grade[];
  grade?: number; // AI-generated overall grade
  feedback?: string;
  isLate: boolean;
  aiGeneratedFeedback?: boolean;
}

const rubricLevels = [
  { 
    value: 'emerging' as const, 
    label: 'Emerging', 
    description: 'Beginning to show understanding', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    score: 1 
  },
  { 
    value: 'developing' as const, 
    label: 'Developing', 
    description: 'Showing progress toward understanding', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    score: 2 
  },
  { 
    value: 'proficient' as const, 
    label: 'Proficient', 
    description: 'Demonstrating solid understanding', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    score: 3 
  },
  { 
    value: 'applying' as const, 
    label: 'Applying', 
    description: 'Applying understanding in new contexts', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    score: 4 
  }
];

export default function AssessmentSubmissions() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated, canAccess } = useTeacherAccess();
  const { toast } = useToast();

  // State for UI interactions - auto-expand ungraded submissions
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<number>>(() => {
    // Will be populated after submissions load
    return new Set();
  });

  // Initialize gradingData from sessionStorage if available, otherwise empty object
  const [gradingData, setGradingData] = useState<Record<number, Record<number, {
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    score: number;
  }>>>(() => {
    try {
      const saved = sessionStorage.getItem(`gradingData_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [bulkGradingProgress, setBulkGradingProgress] = useState(0);
  const [isBulkGrading, setIsBulkGrading] = useState(false);

  // Fetch assessment data
  const { data: assessment, isLoading: assessmentLoading } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${id}`],
    enabled: canAccess && !!id,
  });

  // Fetch submissions
  const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
    queryKey: ['assessment-submissions', id],
    queryFn: async () => {
      const response = await fetch(`/api/assessments/${id}/submissions`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();

      return data;
    },
    enabled: !!id
  });

  // Fetch component skills for the assessment
  const { data: componentSkills = [] } = useQuery<ComponentSkill[]>({
    queryKey: ['/api/competencies/component-skills'],
    enabled: canAccess,
  });

  // Also try to fetch specific component skills if we have the assessment
  const { data: assessmentComponentSkills = [] } = useQuery<ComponentSkill[]>({
    queryKey: ['/api/competencies/component-skills/by-ids', assessment?.componentSkillIds],
    queryFn: async () => {
      if (!assessment?.componentSkillIds?.length) return [];
      
      // Handle both array and object formats for componentSkillIds
      let skillIds: number[] = [];
      if (Array.isArray(assessment.componentSkillIds)) {
        skillIds = assessment.componentSkillIds;
      } else if (typeof assessment.componentSkillIds === 'object') {
        skillIds = Object.values(assessment.componentSkillIds).filter((id): id is number => typeof id === 'number');
      }
      
      if (skillIds.length === 0) return [];
      
      const response = await fetch('/api/competencies/component-skills/by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillIds }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Failed to fetch component skills by IDs');
        return [];
      }
      
      return response.json();
    },
    enabled: canAccess && !!assessment?.componentSkillIds?.length,
  });

  // Filter component skills relevant to this assessment
  const relevantSkills = React.useMemo(() => {
    console.log('Assessment componentSkillIds:', assessment?.componentSkillIds);
    console.log('Available componentSkills:', componentSkills);
    console.log('Assessment-specific componentSkills:', assessmentComponentSkills);
    console.log('ComponentSkills type:', typeof componentSkills);
    console.log('ComponentSkills length:', componentSkills?.length);
    
    // Prefer assessment-specific skills if available
    if (assessmentComponentSkills?.length > 0) {
      console.log('Using assessment-specific component skills:', assessmentComponentSkills);
      return assessmentComponentSkills;
    }
    
    if (!assessment?.componentSkillIds || !componentSkills?.length) {
      console.log('Missing assessment componentSkillIds or componentSkills');
      return [];
    }
    
    // Handle both array and object formats for componentSkillIds
    let skillIds: number[] = [];
    if (Array.isArray(assessment.componentSkillIds)) {
      skillIds = assessment.componentSkillIds;
    } else if (typeof assessment.componentSkillIds === 'object') {
      skillIds = Object.values(assessment.componentSkillIds).filter((id): id is number => typeof id === 'number');
    }
    
    console.log('Processed skillIds:', skillIds);
    console.log('First component skill structure:', componentSkills[0]);
    
    const filtered = componentSkills.filter(skill => {
      const skillId = skill.id;
      const matches = skillIds.includes(skillId);
      console.log(`Skill ${skillId} (${skill.name}) matches: ${matches}`);
      return matches;
    });
    console.log('Relevant skills found:', filtered);
    
    return filtered;
  }, [assessment?.componentSkillIds, componentSkills, assessmentComponentSkills]);

  // Track if grading data has been initialized to prevent resetting user input
  const [isGradingDataInitialized, setIsGradingDataInitialized] = React.useState(false);

  // Initialize gradingData with existing grades when submissions load (only once)
  const initializeGradingData = React.useCallback(() => {
    if (!submissions.length || isGradingDataInitialized) return;



    const initialData: typeof gradingData = {};

    // Initialize data for each submission
    submissions.forEach(submission => {
      initialData[submission.id] = {};

      // Always prioritize existing grades from database
      if (submission.grades && submission.grades.length > 0) {

        submission.grades.forEach(grade => {
          // Handle both string and number score values
          const score = typeof grade.score === 'string' ? parseInt(grade.score) : grade.score;
          initialData[submission.id][grade.componentSkillId] = {
            rubricLevel: grade.rubricLevel,
            feedback: grade.feedback,
            score: score || 1
          };

        });
      } else {


        // Only then check sessionStorage for unsaved manual input
        try {
          const saved = sessionStorage.getItem(`gradingData_${id}`);
          if (saved) {
            const savedData = JSON.parse(saved);
            if (savedData[submission.id]) {
              Object.keys(savedData[submission.id]).forEach(skillId => {
                const skillIdNum = parseInt(skillId);
                if (savedData[submission.id][skillIdNum]) {
                  initialData[submission.id][skillIdNum] = savedData[submission.id][skillIdNum];

                }
              });
            }
          }
        } catch (error) {
          console.warn("Failed to parse saved grading data:", error);
        }
      }
    });


    setGradingData(initialData);
    setIsGradingDataInitialized(true);
  }, [submissions, relevantSkills, isGradingDataInitialized, id]);

  // Initialize grading data when submissions and skills are loaded (only once)
  React.useEffect(() => {
    initializeGradingData();
  }, [initializeGradingData]);

  // Auto-expand ungraded submissions for easier access to manual grading
  React.useEffect(() => {
    if (submissions.length > 0 && expandedSubmissions.size === 0) {
      const ungradedSubmissionIds = submissions
        .filter(sub => !sub.grades?.length && !sub.grade)
        .map(sub => sub.id);
      
      if (ungradedSubmissionIds.length > 0) {
        setExpandedSubmissions(new Set(ungradedSubmissionIds));
      }
    }
  }, [submissions, expandedSubmissions.size]);

  // Individual grading mutation
  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, grades }: {
      submissionId: number;
      grades: Array<{
        componentSkillId: number;
        rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
        feedback: string;
        score: number;
      }>;
    }) => {
      const response = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades, generateAiFeedback: false }),
      });
      if (!response.ok) throw new Error('Failed to grade submission');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Submission graded successfully" });
      refetchSubmissions();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to grade submission", variant: "destructive" });
    },
  });

  // State to track which submissions are being AI graded
  const [aiGradingSubmissions, setAiGradingSubmissions] = useState<Set<number>>(new Set());

  // AI grading mutation for individual submission
  const aiGradeMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      setAiGradingSubmissions(prev => new Set(prev).add(submissionId));
      const response = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAiFeedback: true }),
      });
      if (!response.ok) throw new Error('Failed to AI grade submission');
      return response.json();
    },
    onSuccess: (_, submissionId) => {
      toast({ title: "Success", description: "AI grading completed" });
      setAiGradingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
      refetchSubmissions();
    },
    onError: (_, submissionId) => {
      toast({ title: "Error", description: "AI grading failed", variant: "destructive" });
      setAiGradingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    },
  });

  // Bulk AI grading mutation
  const bulkGradeMutation = useMutation({
    mutationFn: async () => {
      setIsBulkGrading(true);
      setBulkGradingProgress(0);

      const ungradedSubmissions = submissions.filter(sub => 
        !sub.grades?.length && !sub.grade
      );
      const total = ungradedSubmissions.length;

      const results = [];
      for (let i = 0; i < ungradedSubmissions.length; i++) {
        const submission = ungradedSubmissions[i];
        try {
          const response = await fetch(`/api/submissions/${submission.id}/grade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generateAiFeedback: true }),
          });
          
          if (response.ok) {
            results.push({ submissionId: submission.id, success: true });
          } else {
            results.push({ submissionId: submission.id, success: false, error: `HTTP ${response.status}` });
          }
        } catch (error) {
          console.error(`Failed to grade submission ${submission.id}:`, error);
          results.push({ 
            submissionId: submission.id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
        
        // Update progress atomically
        setBulkGradingProgress(((i + 1) / total) * 100);
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      if (failureCount > 0) {
        toast({ 
          title: "Bulk Grading Completed", 
          description: `${successCount} submissions graded successfully, ${failureCount} failed`,
          variant: failureCount > successCount ? "destructive" : "default"
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

  // Helper functions
  const toggleSubmissionExpansion = (submissionId: number) => {
    const newExpanded = new Set(expandedSubmissions);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedSubmissions(newExpanded);
  };

  const updateGradingData = (submissionId: number, skillId: number, data: {
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    score: number;
  }) => {


    setGradingData(prev => {
      const newData = {
        ...prev,
        [submissionId]: {
          ...prev[submissionId],
          [skillId]: data
        }
      };

      // Save to sessionStorage for persistence across navigation
      try {
        const storageKey = `gradingData_${id}`;
        sessionStorage.setItem(storageKey, JSON.stringify(newData));

      } catch (error) {
        console.error('Failed to save grading data to sessionStorage:', error);
      }

      return newData;
    });
  };

  const handleManualGrade = (submissionId: number) => {
    const submissionGrades = gradingData[submissionId];
    if (!submissionGrades) return;

    const grades = Object.entries(submissionGrades).map(([skillId, gradeData]) => ({
      componentSkillId: parseInt(skillId),
      ...gradeData
    }));

    gradeMutation.mutate({ submissionId, grades });
  };

  // Clear sessionStorage for this submission when grades are successfully saved
  React.useEffect(() => {
    if (gradeMutation.isSuccess && gradeMutation.variables?.submissionId) {
      const submissionId = gradeMutation.variables.submissionId;


      try {
        const storageKey = `gradingData_${id}`;
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const savedData = JSON.parse(saved);
          if (savedData[submissionId]) {
            delete savedData[submissionId];
            sessionStorage.setItem(storageKey, JSON.stringify(savedData));

          }
        }
      } catch (error) {
        console.error('Failed to update sessionStorage after successful save:', error);
      }
    }
  }, [gradeMutation.isSuccess, gradeMutation.variables, id]);

  const getRubricLevelBadge = (level: string, showSticker: boolean = false) => {
    const levelConfig = rubricLevels.find(r => r.value === level);
    if (!levelConfig) return null;

    return (
      <Badge className={`${levelConfig.color} border`}>
        {levelConfig.label}
        {showSticker && <span className="ml-1">⭐️</span>}
      </Badge>
    );
  };

  const getSubmissionStats = () => {
    const total = submissions.length;
    const graded = submissions.filter((sub: any) => 
      sub.grades?.length || (sub.grade !== undefined && sub.grade !== null)
    ).length;
    const ungraded = total - graded;
    const aiGraded = submissions.filter((sub: any) => sub.aiGeneratedFeedback).length;

    return { total, graded, ungraded, aiGraded };
  };

  const handleViewSubmission = (submissionId: number) => {
    setLocation(`/teacher/assessments/${id}/submissions/${submissionId}`);
  };

  const getAverageScore = (submission: Submission) => {
    // Check for AI-generated grade first (stored in submission.grade)
    if (submission.grade !== undefined && submission.grade !== null) {
      return submission.grade;
    }

    // Fallback to manual grades if available
    if (!submission.grades?.length) return null;
    const totalScore = submission.grades.reduce((sum, grade) => sum + parseFloat(grade.score), 0);
    return Math.round((totalScore / submission.grades.length) * 25); // Convert to percentage (4 levels * 25%)
  };

  // Check access first
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
            <Button onClick={() => setLocation('/teacher/assessments')}>
              Back to Assessments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getSubmissionStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Grading: {assessment.title}
              </h1>
              <p className="text-gray-600 mb-4">{assessment.description}</p>

              {/* Quick Stats */}
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
                    Due: {format(new Date(assessment.dueDate), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Grading Controls */}
        <Card className="mb-8 border-gradient-to-r from-blue-200 to-purple-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <Brain className="h-6 w-6" />
              <span className="text-xl">AI-Powered Grading</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bulk Grading */}
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
                      <span className="text-blue-700">
                        AI grading in progress...
                      </span>
                      <span className="font-medium text-blue-800">
                        {Math.round(bulkGradingProgress)}% Complete
                      </span>
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
                      ? 'Grading in Progress...' 
                      : stats.ungraded > 0 
                        ? `Grade ${stats.ungraded} Submissions with AI`
                        : 'All Submissions Graded'
                    }
                  </span>
                </Button>

                {stats.ungraded === 0 && (
                  <div className="flex items-center justify-center space-x-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>All submissions have been graded</span>
                  </div>
                )}
              </div>

              {/* Individual AI Grading Info */}
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

        {/* Quick Actions Toolbar */}
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
                        // Expand ALL submissions for manual grading (both graded and ungraded)
                        const allIds = new Set(submissions.map(s => s.id));
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
                    // Expand all submissions
                    const allIds = new Set(submissions.map(s => s.id));
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

        {/* Submissions List */}
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
            submissions.map((submission) => {
              const isExpanded = expandedSubmissions.has(submission.id);
              const averageScore = getAverageScore(submission);

              return (
                <Card key={submission.id} className="overflow-hidden">
                  {/* Submission Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {submission.studentName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{submission.studentName}</h3>
                          <p className="text-sm text-gray-500">{submission.studentUsername}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              Submitted: {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
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
                            {aiGradingSubmissions.has(submission.id) && (
                              <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse flex items-center space-x-1">
                                <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce"></div>
                                <span>AI Processing...</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Grade Status */}
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

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          {(!submission.grades || submission.grades.length === 0) && !submission.grade && (
                            <Button
                              size="sm"
                              onClick={() => aiGradeMutation.mutate(submission.id)}
                              disabled={aiGradingSubmissions.has(submission.id) || isBulkGrading}
                              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md"
                            >
                              <Brain className="h-4 w-4" />
                              <span>{aiGradingSubmissions.has(submission.id) ? 'AI Grading...' : 'Grade with AI'}</span>
                            </Button>
                          )}

                          {(submission.grades && submission.grades.length > 0) || submission.grade ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => aiGradeMutation.mutate(submission.id)}
                              disabled={aiGradingSubmissions.has(submission.id) || isBulkGrading}
                              className="flex items-center space-x-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>{aiGradingSubmissions.has(submission.id) ? 'Re-grading...' : 'Re-grade with AI'}</span>
                            </Button>
                          ) : null}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleSubmissionExpansion(submission.id)}
                            className="flex items-center space-x-2"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>{isExpanded ? 'Collapse' : 'Review & Grade'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Submission Content */}
                  {isExpanded && (
                    <div className="p-6 bg-gray-50 space-y-6">
                      {/* Student Responses */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                          <MessageSquare className="h-5 w-5" />
                          <span>Student Responses</span>
                        </h4>

                        {assessment?.questions?.map((question, index) => {
                          // Handle both array format (new) and object format (legacy)
                          let responseText = "No answer provided";
                          if (Array.isArray(submission.responses)) {
                            const response = submission.responses.find(r => r.questionId === question.id);
                            responseText = response?.answer || "No answer provided";
                          } else if (submission.responses && typeof submission.responses === 'object') {
                            responseText = submission.responses[question.id] || "No answer provided";
                          }

                          return (
                            <Card key={question.id} className="bg-white">
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
                                      <p className="text-gray-800 whitespace-pre-wrap break-words">
                                        {responseText}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* AI-Generated Feedback Display */}
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

                      {/* AI-Generated Component Skill Grades Display */}
                      {submission.grades && submission.grades.length > 0 && submission.aiGeneratedFeedback && (
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Brain className="h-5 w-5 text-blue-600" />
                            <span>AI Component Skill Assessment</span>
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {submission.grades?.map((grade) => {
                              const skill = relevantSkills.find(s => s.id === grade.componentSkillId);

                              return (
                                <Card key={grade.id} className="bg-blue-50 border-blue-200">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h6 className="font-medium text-gray-900">{skill?.name}</h6>
                                      {getRubricLevelBadge(grade.rubricLevel, true)}
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-lg font-semibold text-blue-800">
                                        Score: {grade.score}/4
                                      </div>
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

                      {/* Current Grades Display */}
                      {submission.grades && submission.grades.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <Star className="h-5 w-5" />
                            <span>Manual Grades</span>
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {submission.grades?.map((grade) => {
                              const skill = relevantSkills.find(s => s.id === grade.componentSkillId);

                              return (
                                <Card key={grade.id} className="bg-white">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h6 className="font-medium text-gray-900">{skill?.name}</h6>
                                      {getRubricLevelBadge(grade.rubricLevel, true)}
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-lg font-semibold text-gray-900">
                                        Score: {grade.score}/4
                                      </div>
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

                      {/* Manual Grading Interface - Show only if relevant skills are available */}
                      {relevantSkills.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <GraduationCap className="h-5 w-5" />
                            <span>
                              {submission.grades && submission.grades.length > 0 
                                ? (submission.aiGeneratedFeedback ? 'Review & Edit AI Grading' : 'Edit Manual Grading')
                                : 'Manual Grading'
                              }
                            </span>
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {relevantSkills.map((skill) => {
                              // Get existing grade for this skill if available
                              const existingGrade = submission.grades?.find(g => g.componentSkillId === skill.id);

                              return (
                                <Card key={skill.id} className="bg-white">
                                  <CardContent className="p-4 space-y-4">
                                    <h6 className="font-medium text-gray-900">{skill.name}</h6>

                                    <div className="space-y-3">
                                      <div>
                                        <Label className="text-sm font-medium">Rubric Level</Label>
                                        <Select
                                          value={
                                            gradingData[submission.id]?.[skill.id]?.rubricLevel || 
                                            ''
                                          }
                                          onValueChange={(value: 'emerging' | 'developing' | 'proficient' | 'applying') => {
                                            const level = rubricLevels.find(r => r.value === value);
                                            updateGradingData(submission.id, skill.id, {
                                              rubricLevel: value,
                                              score: level?.score || 1,
                                              feedback: gradingData[submission.id]?.[skill.id]?.feedback || ''
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select level" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {rubricLevels.map((level) => (
                                              <SelectItem key={level.value} value={level.value}>
                                                <div className="flex items-center space-x-2">
                                                  <Badge className={level.color}>
                                                    {level.label}
                                                  </Badge>
                                                  <span className="text-sm">{level.description}</span>
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
                                          value={
                                            gradingData[submission.id]?.[skill.id]?.feedback || 
                                            ''
                                          }
                                          onChange={(e) => {
                                            const current = gradingData[submission.id]?.[skill.id];
                                            const currentLevel = current?.rubricLevel || 'emerging';
                                            const currentScore = current?.score || 1;
                                            updateGradingData(submission.id, skill.id, {
                                              rubricLevel: currentLevel,
                                              score: currentScore,
                                              feedback: e.target.value
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
                              onClick={() => {
                                setGradingData(prev => {
                                  const newData = { ...prev, [submission.id]: {} };
                                  try {
                                    sessionStorage.setItem(`gradingData_${id}`, JSON.stringify(newData));
                                  } catch (error) {
                                    console.warn('Failed to update sessionStorage:', error);
                                  }
                                  return newData;
                                });
                              }}
                              className="flex items-center space-x-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>Reset</span>
                            </Button>

                            <Button
                              onClick={() => handleManualGrade(submission.id)}
                              disabled={gradeMutation.isPending}
                              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-4 w-4" />
                              <span>{gradeMutation.isPending ? 'Saving...' : 'Save Grade'}</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}