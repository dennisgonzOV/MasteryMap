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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Calendar, 
  Target, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Users,
  MessageCircle
} from "lucide-react";

export default function StudentProjectDetail({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id);

  // Function to handle milestone completion
  const handleMilestoneComplete = async (milestoneId: number) => {
    try {
      // Fetch assessments for this milestone
      const response = await fetch(`/api/milestones/${milestoneId}/assessments`);
      if (!response.ok) throw new Error('Failed to fetch milestone assessments');

      const assessments = await response.json();

      if (assessments.length > 0) {
        // Navigate to the first assessment for this milestone
        setLocation(`/student/assessments/${assessments[0].id}`);
      } else {
        // If no assessments, show the milestone detail page
        setLocation(`/student/milestones/${milestoneId}`);
        toast({
          title: "No Assessment Available",
          description: "This milestone doesn't have an assessment yet. Contact your teacher for more information.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching milestone assessments:', error);
      toast({
        title: "Error",
        description: "Failed to load milestone assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: isAuthenticated && !isNaN(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  // Fetch project milestones
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "milestones"],
    enabled: isAuthenticated && !isNaN(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/milestones`);
      if (!response.ok) throw new Error('Failed to fetch milestones');
      return response.json();
    },
  });

  // Fetch student submissions to check completion status
  const { data: studentSubmissions = [] } = useQuery({
    queryKey: ["/api/submissions/student"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch(`/api/submissions/student`);
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
  });

  // Enhanced milestone status calculation with submission tracking
  const milestonesWithStatus = milestones.map(milestone => {
    // Check if student has submitted any assessments for this milestone
    const milestoneSubmissions = studentSubmissions.filter(submission => {
      // Check if the submission's assessment belongs to this milestone
      return submission.assessment && submission.assessment.milestoneId === milestone.id;
    });
    
    console.log(`Milestone ${milestone.id} (${milestone.title}):`, {
      totalSubmissions: studentSubmissions.length,
      milestoneSubmissions: milestoneSubmissions.length,
      submissionAssessments: milestoneSubmissions.map(s => ({
        id: s.id,
        assessmentId: s.assessmentId,
        milestoneId: s.assessment?.milestoneId,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt
      }))
    });
    
    const hasSubmissions = milestoneSubmissions.length > 0;
    
    // Check if any submissions are graded (indicating completion)
    const hasGradedSubmissions = milestoneSubmissions.some(submission => 
      submission.gradedAt || submission.feedback
    );
    
    // Determine display status based on submission and grading state
    let displayStatus = 'not_started';
    if (hasGradedSubmissions) {
      displayStatus = 'completed';
    } else if (hasSubmissions) {
      displayStatus = 'submitted';
    } else if (milestone.status === 'completed') {
      displayStatus = 'completed';
    }
    
    return {
      ...milestone,
      hasSubmissions,
      hasGradedSubmissions,
      displayStatus
    };
  });

  const completedMilestones = milestonesWithStatus.filter(m => 
    m.displayStatus === 'completed' || m.displayStatus === 'submitted'
  ).length;
  const progressPercentage = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

  const overdueMilestones = milestonesWithStatus.filter(m => 
    m.dueDate && new Date(m.dueDate) < new Date() && m.displayStatus !== 'completed' && m.displayStatus !== 'submitted'
  );

  const upcomingMilestones = milestonesWithStatus.filter(m => 
    m.dueDate && new Date(m.dueDate) >= new Date() && m.displayStatus !== 'completed' && m.displayStatus !== 'submitted'
  );

  if (isLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading project...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'student') {
    return null;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Navigation />
        <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
            <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => setLocation('/student/projects')}>
              Back to Projects
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/student/projects')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Projects</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge 
                    className={
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }
                  >
                    {project.status}
                  </Badge>
                  {project.dueDate && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Due {format(new Date(project.dueDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <Card className="apple-shadow border-0">
                <CardHeader>
                  <CardTitle>Project Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{project.description}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Progress Card */}
              <Card className="apple-shadow border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Progress Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                      <span className="text-sm font-medium text-gray-900">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{completedMilestones} completed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span>{milestones.length} total</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Cards */}
              {overdueMilestones.length > 0 && (
                <Card className="apple-shadow border-0 border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">Overdue Tasks</p>
                        <p className="text-sm text-red-700">{overdueMilestones.length} milestones need attention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {upcomingMilestones.length > 0 && (
                <Card className="apple-shadow border-0 border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Upcoming</p>
                        <p className="text-sm text-blue-700">{upcomingMilestones.length} milestones due soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Project Content Tabs */}
          <Card className="apple-shadow border-0">
            <Tabs defaultValue="milestones" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="milestones" className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Milestones</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="milestones" className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Project Milestones</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {milestonesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading milestones...</span>
                    </div>
                  ) : milestones.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No milestones have been created for this project yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {milestonesWithStatus.map((milestone, index) => (
                        <div 
                          key={milestone.id}
                          className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {milestone.displayStatus === 'completed' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : milestone.displayStatus === 'submitted' ? (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            ) : milestone.dueDate && new Date(milestone.dueDate) < new Date() ? (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium text-gray-900">{milestone.title}</h3>
                                {milestone.displayStatus === 'completed' && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    Completed
                                  </Badge>
                                )}
                                {milestone.displayStatus === 'submitted' && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    Submitted
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {milestone.dueDate && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    milestone.displayStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                    milestone.displayStatus === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                    new Date(milestone.dueDate) < new Date() ? 'bg-red-100 text-red-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    Due {format(new Date(milestone.dueDate), 'MMM d')}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant={milestone.displayStatus === 'completed' || milestone.displayStatus === 'submitted' ? 'outline' : 'default'}
                                  onClick={() => {
                                    if (milestone.displayStatus === 'completed' || milestone.displayStatus === 'submitted') {
                                      setLocation(`/student/milestones/${milestone.id}`);
                                    } else {
                                      handleMilestoneComplete(milestone.id);
                                    }
                                  }}
                                  className={
                                    milestone.displayStatus === 'completed' 
                                      ? 'text-green-600 border-green-200' 
                                      : milestone.displayStatus === 'submitted' 
                                        ? 'text-blue-600 border-blue-300 bg-blue-50 cursor-not-allowed' 
                                        : ''
                                  }
                                  disabled={milestone.displayStatus === 'submitted'}
                                >
                                  {milestone.displayStatus === 'completed' ? 'View Completed' : 
                                   milestone.displayStatus === 'submitted' ? 'Submitted' : 'Complete'}
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                            
                            {/* Show submission date for submitted milestones */}
                            {milestone.displayStatus === 'submitted' && (() => {
                              // Find the most recent submission for this milestone
                              const milestoneSubmissions = studentSubmissions.filter(submission => {
                                return submission.assessment?.milestoneId === milestone.id;
                              });
                              
                              if (milestoneSubmissions.length > 0) {
                                const mostRecentSubmission = milestoneSubmissions.reduce((latest, current) => {
                                  return new Date(current.submittedAt) > new Date(latest.submittedAt) ? current : latest;
                                });
                                
                                return (
                                  <div className="flex items-center space-x-1 text-xs text-blue-600">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Submitted on {format(new Date(mostRecentSubmission.submittedAt), 'MMM d, yyyy \'at\' h:mm a')}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Show completion date for completed milestones */}
                            {milestone.displayStatus === 'completed' && (() => {
                              // Find the most recent graded submission for this milestone
                              const milestoneSubmissions = studentSubmissions.filter(submission => {
                                return submission.assessment?.milestoneId === milestone.id && submission.gradedAt;
                              });
                              
                              if (milestoneSubmissions.length > 0) {
                                const mostRecentGraded = milestoneSubmissions.reduce((latest, current) => {
                                  return new Date(current.gradedAt) > new Date(latest.gradedAt) ? current : latest;
                                });
                                
                                return (
                                  <div className="flex items-center space-x-1 text-xs text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Completed on {format(new Date(mostRecentGraded.gradedAt), 'MMM d, yyyy \'at\' h:mm a')}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
}