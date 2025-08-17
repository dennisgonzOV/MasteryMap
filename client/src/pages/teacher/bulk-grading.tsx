
import React, { useState } from 'react';
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Brain, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Assessment {
  id: number;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    rubricCriteria?: string;
    sampleAnswer?: string;
  }>;
}

interface Submission {
  id: number;
  studentId: number;
  studentName: string;
  studentUsername: string;
  submittedAt: string;
  answers: Record<string, string>;
  grade?: number;
  feedback?: string;
  isLate: boolean;
}

export default function BulkGrading() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [gradingProgress, setGradingProgress] = useState(0);
  const [isGrading, setIsGrading] = useState(false);
  const [gradedSubmissions, setGradedSubmissions] = useState<number[]>([]);

  // Fetch assessment data
  const { data: assessment, isLoading: assessmentLoading } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${id}`],
    enabled: isAuthenticated && !!id,
  });

  // Fetch submissions
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: [`/api/assessments/${id}/submissions`],
    enabled: isAuthenticated && !!id,
  });

  // Robust queue system for handling bulk grading
  const gradeSubmissionWithRetry = async (submission: Submission, maxRetries = 3): Promise<{ success: boolean; error?: string }> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add abort controller for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`/api/submissions/${submission.id}/grade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            generateAiFeedback: true,
            grade: 0, // Placeholder, AI will determine actual grade
          }),
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        if (response.ok) {
          try {
            const result = await response.json();
            return { success: true };
          } catch (jsonError) {
            console.error(`JSON parsing error for submission ${submission.id}:`, jsonError);
            return { success: false, error: 'Invalid response format' };
          }
        } else {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            // Failed to parse error response, use status text
            errorMessage = response.statusText || errorMessage;
          }
          
          if (attempt === maxRetries) {
            return { success: false, error: errorMessage };
          }
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      } catch (error) {
        let errorMessage = 'Network error';
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = 'Request timeout';
          } else {
            errorMessage = error.message;
          }
        }
        
        console.error(`Attempt ${attempt} failed for submission ${submission.id}:`, error);
        
        if (attempt === maxRetries) {
          return { success: false, error: errorMessage };
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    return { success: false, error: 'Max retries exceeded' };
  };

  const processSubmissionsQueue = async (submissionsQueue: Submission[], concurrency = 3) => {
    const results: Array<{ submission: Submission; success: boolean; error?: string }> = [];
    let completedCount = 0;
    
    // Process submissions in batches with Promise.allSettled for better error handling
    const processBatch = async (batch: Submission[]) => {
      const promises = batch.map(async (submission) => {
        try {
          const result = await gradeSubmissionWithRetry(submission).catch((error) => {
            // Catch any unhandled promise rejections from gradeSubmissionWithRetry
            console.error(`Unhandled promise rejection for submission ${submission.id}:`, error);
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unhandled promise rejection'
            };
          });
          
          // Update UI atomically after each completion
          completedCount++;
          const progress = (completedCount / submissionsQueue.length) * 100;
          
          // Use functional state updates to avoid race conditions
          setGradingProgress(progress);
          
          if (result.success) {
            setGradedSubmissions(prev => {
              if (!prev.includes(submission.id)) {
                return [...prev, submission.id];
              }
              return prev;
            });
          }
          
          return { submission, ...result };
        } catch (error) {
          // Final safety net for any errors in the promise handler itself
          console.error(`Critical error in promise handler for submission ${submission.id}:`, error);
          completedCount++;
          setGradingProgress((completedCount / submissionsQueue.length) * 100);
          return {
            submission,
            success: false,
            error: error instanceof Error ? error.message : 'Critical error'
          };
        }
      });
      
      // Wait for all promises in the batch to settle
      const batchResults = await Promise.allSettled(promises);
      
      // Process results and handle any rejections
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          
          if (result.value.success) {
            toast({
              title: "Submission Graded",
              description: `${result.value.submission.studentName}: Successfully graded`,
            });
          } else {
            console.error(`Failed to grade submission ${result.value.submission.id}:`, result.value.error);
            toast({
              title: "Grading Error",
              description: `Failed to grade ${result.value.submission.studentName}: ${result.value.error}`,
              variant: "destructive",
            });
          }
        } else {
          // Handle promise rejection
          const submission = batch[index];
          results.push({
            submission,
            success: false,
            error: 'Promise rejected: ' + result.reason
          });
          
          console.error(`Promise rejected for submission ${submission.id}:`, result.reason);
          toast({
            title: "Grading Error",
            description: `Failed to grade ${submission.studentName}: Promise rejected`,
            variant: "destructive",
          });
        }
      });
    };

    // Process submissions in controlled batches
    for (let i = 0; i < submissionsQueue.length; i += concurrency) {
      const batch = submissionsQueue.slice(i, i + concurrency);
      await processBatch(batch);
    }

    return results;
  };

  const startBulkGrading = async () => {
    if (!submissions.length) return;

    setIsGrading(true);
    setGradingProgress(0);
    setGradedSubmissions([]);

    // Add global unhandled promise rejection handler for this operation
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection during bulk grading:', event.reason);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please check the console for details.",
        variant: "destructive",
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const ungradedSubmissions = submissions.filter(s => s.grade === undefined);
    
    if (ungradedSubmissions.length === 0) {
      toast({
        title: "No Ungraded Submissions",
        description: "All submissions have already been graded.",
      });
      setIsGrading(false);
      return;
    }

    toast({
      title: "AI Grading Started",
      description: `Processing ${ungradedSubmissions.length} submissions...`,
    });

    try {
      const results = await processSubmissionsQueue(ungradedSubmissions);
      
      // Refresh submissions data
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/assessments/${id}/submissions`] 
      });

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Bulk Grading Complete",
          description: `Successfully graded ${successCount} submissions.${failedCount > 0 ? ` ${failedCount} submissions failed.` : ''}`,
        });
      } else {
        toast({
          title: "Grading Failed",
          description: "No submissions were successfully graded. Please check the server logs.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Bulk grading error:", error);
      toast({
        title: "Grading Error",
        description: "An unexpected error occurred during bulk grading. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clean up global promise rejection handler
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      setIsGrading(false);
      setGradingProgress(0);
    }
  };

  if (assessmentLoading || submissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading assessment...</span>
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

  const totalSubmissions = submissions.length;
  const gradedCount = submissions.filter(s => s.grade !== undefined).length;
  const ungradedCount = totalSubmissions - gradedCount;
  const lateSubmissions = submissions.filter(s => s.isLate).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => setLocation(`/teacher/assessments/${id}`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Assessment Details</span>
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Bulk Grading</h1>
              <p className="text-gray-600 text-lg mb-4">{assessment.title}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Grading Progress */}
            {isGrading && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-800">
                    <Brain className="h-5 w-5" />
                    <span>AI Grading in Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={gradingProgress} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">
                        Processing submissions with AI...
                      </span>
                      <span className="font-medium text-blue-800">
                        {Math.round(gradingProgress)}% Complete
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Grading Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <span>AI Bulk Grading</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Use AI to automatically grade all ungraded submissions for this assessment. 
                    The AI will analyze student responses against the rubric criteria and provide 
                    personalized feedback for each submission.
                  </p>
                  
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={startBulkGrading}
                      disabled={isGrading || ungradedCount === 0}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      <Brain className="h-4 w-4" />
                      <span>
                        {isGrading 
                          ? 'Grading in Progress...' 
                          : `Grade ${ungradedCount} Submissions with AI`
                        }
                      </span>
                    </Button>
                    
                    {ungradedCount === 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        All submissions graded
                      </Badge>
                    )}
                  </div>

                  {ungradedCount > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          This will grade {ungradedCount} submissions. You can review and edit 
                          the AI-generated grades and feedback afterwards.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submissions.slice(0, 10).map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {submission.studentName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{submission.studentName}</p>
                          <p className="text-xs text-gray-500">
                            Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {submission.isLate && (
                          <Badge variant="destructive" className="text-xs">Late</Badge>
                        )}
                        {submission.grade !== undefined ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600">
                              {submission.grade}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600">Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grading Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Submissions</span>
                    <span className="font-semibold text-gray-900">{totalSubmissions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Graded</span>
                    <span className="font-semibold text-green-600">{gradedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-semibold text-orange-600">{ungradedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Late Submissions</span>
                    <span className="font-semibold text-red-600">{lateSubmissions}</span>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Completion Rate</span>
                      <span className="text-sm font-medium">
                        {totalSubmissions > 0 ? Math.round((gradedCount / totalSubmissions) * 100) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={totalSubmissions > 0 ? (gradedCount / totalSubmissions) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation(`/teacher/assessments/${id}/submissions`)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View All Submissions
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation(`/teacher/assessments/${id}`)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Assessment Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
