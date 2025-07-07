import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Target, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ClipboardList
} from "lucide-react";

export default function StudentMilestoneDetail({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const milestoneId = parseInt(params.id);

  // Fetch milestone details
  const { data: milestone, isLoading: milestoneLoading } = useQuery({
    queryKey: ["/api/milestones", milestoneId],
    enabled: isAuthenticated && !isNaN(milestoneId),
    queryFn: async () => {
      const response = await fetch(`/api/milestones/${milestoneId}`);
      if (!response.ok) throw new Error('Failed to fetch milestone');
      return response.json();
    },
  });

  // Fetch assessments for this milestone
  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery({
    queryKey: ["/api/milestones", milestoneId, "assessments"],
    enabled: isAuthenticated && !isNaN(milestoneId),
    queryFn: async () => {
      const response = await fetch(`/api/milestones/${milestoneId}/assessments`);
      if (!response.ok) throw new Error('Failed to fetch assessments');
      return response.json();
    },
  });

  // Fetch project details if milestone has a project
  const { data: project } = useQuery({
    queryKey: ["/api/projects", milestone?.projectId],
    enabled: isAuthenticated && milestone?.projectId,
    queryFn: async () => {
      const response = await fetch(`/api/projects/${milestone.projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  if (isLoading || milestoneLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading milestone...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'student') {
    return null;
  }

  if (!milestone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Navigation />
        <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Milestone Not Found</h1>
            <p className="text-gray-600 mb-6">The milestone you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => setLocation('/student/projects')}>
              Back to Projects
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isOverdue = milestone.dueDate && new Date(milestone.dueDate) < new Date();
  const isCompleted = milestone.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (project) {
                    setLocation(`/student/projects/${project.id}`);
                  } else {
                    setLocation('/student/projects');
                  }
                }}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to {project ? 'Project' : 'Projects'}</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{milestone.title}</h1>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge 
                    className={
                      isCompleted ? 'bg-green-100 text-green-800' :
                      isOverdue ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }
                  >
                    {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'In Progress'}
                  </Badge>
                  {milestone.dueDate && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Due {format(new Date(milestone.dueDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Context */}
          {project && (
            <Card className="apple-shadow border-0 mb-8">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Part of Project</p>
                    <p className="text-sm text-blue-600">{project.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestone Details */}
          <Card className="apple-shadow border-0 mb-8">
            <CardHeader>
              <CardTitle>Milestone Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{milestone.description}</p>
            </CardContent>
          </Card>

          {/* Status Alert */}
          {isOverdue && !isCompleted && (
            <Card className="apple-shadow border-0 border-l-4 border-l-red-500 mb-8">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">This milestone is overdue</p>
                    <p className="text-sm text-red-700">Please complete the required assessments as soon as possible.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isCompleted && (
            <Card className="apple-shadow border-0 border-l-4 border-l-green-500 mb-8">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Milestone completed!</p>
                    <p className="text-sm text-green-700">Great job completing this milestone. You can review your submissions below.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessments Section */}
          <Card className="apple-shadow border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="h-5 w-5" />
                <span>Required Assessments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading assessments...</span>
                </div>
              ) : assessments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No assessments have been assigned for this milestone yet.</p>
                  <p className="text-sm text-gray-500 mt-2">Check back later or contact your teacher for more information.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div 
                      key={assessment.id}
                      className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{assessment.title}</h3>
                          <div className="flex items-center space-x-2">
                            {assessment.dueDate && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                new Date(assessment.dueDate) < new Date() ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                Due {format(new Date(assessment.dueDate), 'MMM d')}
                              </span>
                            )}
                            <Button
                              size="sm"
                              onClick={() => setLocation(`/student/assessments/${assessment.id}`)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Start Assessment
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{assessment.description}</p>
                        {assessment.questions && (
                          <p className="text-xs text-gray-500 mt-2">
                            {assessment.questions.length} questions
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}