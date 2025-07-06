import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Navigation from '@/components/navigation';
import NotificationSystem from '@/components/notification-system';
import ProgressTracker from '@/components/progress-tracker';
import ProjectManagementModal from '@/components/modals/project-management-modal';
import { useAuth } from '@/hooks/useAuth';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Award,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Eye
} from 'lucide-react';

interface TeacherDashboardStats {
  activeProjects: number;
  totalStudents: number;
  pendingGrades: number;
  credentialsAwarded: number;
  upcomingDeadlines: number;
}

interface ProjectOverview {
  id: number;
  title: string;
  description: string;
  studentsAssigned: number;
  completionRate: number;
  nextDeadline: string;
  status: 'active' | 'planning' | 'completed';
}

interface PendingTask {
  id: number;
  type: 'grading' | 'feedback' | 'milestone-review' | 'credential-approval';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  studentName?: string;
  projectTitle?: string;
}

export default function EnhancedTeacherDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Mock data - replace with real API calls
  const stats: TeacherDashboardStats = {
    activeProjects: 8,
    totalStudents: 145,
    pendingGrades: 23,
    credentialsAwarded: 89,
    upcomingDeadlines: 5
  };

  const projects: ProjectOverview[] = [
    {
      id: 1,
      title: 'Digital Portfolio Creation',
      description: 'Students create comprehensive digital portfolios showcasing their learning',
      studentsAssigned: 32,
      completionRate: 78,
      nextDeadline: '2024-12-15',
      status: 'active'
    },
    {
      id: 2,
      title: 'Sustainable Innovation Challenge',
      description: 'Teams develop solutions for environmental sustainability',
      studentsAssigned: 28,
      completionRate: 65,
      nextDeadline: '2024-12-20',
      status: 'active'
    },
    {
      id: 3,
      title: 'Data Storytelling Workshop',
      description: 'Learn to visualize and communicate insights from data',
      studentsAssigned: 24,
      completionRate: 92,
      nextDeadline: '2024-12-10',
      status: 'active'
    }
  ];

  const pendingTasks: PendingTask[] = [
    {
      id: 1,
      type: 'grading',
      title: 'Grade Milestone Submissions',
      description: 'Review and grade 12 milestone submissions for Digital Portfolio project',
      priority: 'high',
      dueDate: '2024-12-08',
      projectTitle: 'Digital Portfolio Creation'
    },
    {
      id: 2,
      type: 'credential-approval',
      title: 'Approve Badge Recommendations',
      description: 'Review AI-suggested badges for 8 students who reached proficient level',
      priority: 'medium',
      dueDate: '2024-12-10',
    },
    {
      id: 3,
      type: 'feedback',
      title: 'Provide Assessment Feedback',
      description: 'Complete feedback for skills assessment submissions',
      priority: 'medium',
      dueDate: '2024-12-12',
      studentName: 'Sarah Chen'
    }
  ];

  const milestones = [
    {
      id: 1,
      title: 'Research Phase Complete',
      description: 'Complete initial research and planning',
      dueDate: '2024-12-15',
      status: 'in_progress' as const,
      progress: 75
    },
    {
      id: 2,
      title: 'Prototype Development',
      description: 'Create working prototype of solution',
      dueDate: '2024-12-20',
      status: 'not_started' as const,
      progress: 0
    },
    {
      id: 3,
      title: 'Final Presentation',
      description: 'Present final solution to panel',
      dueDate: '2024-12-25',
      status: 'not_started' as const,
      progress: 0
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'grading':
        return <FileText className="h-4 w-4" />;
      case 'feedback':
        return <Eye className="h-4 w-4" />;
      case 'milestone-review':
        return <CheckCircle className="h-4 w-4" />;
      case 'credential-approval':
        return <Award className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName || 'Teacher'}
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your classes today
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationSystem userId={user?.id || 0} userRole="teacher" />
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Projects</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                    </div>
                    <Users className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Grades</p>
                      <p className="text-2xl font-bold text-red-600">{stats.pendingGrades}</p>
                    </div>
                    <FileText className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Credentials</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.credentialsAwarded}</p>
                    </div>
                    <Award className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Deadlines</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.upcomingDeadlines}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Priority Tasks</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTaskIcon(task.type)}
                        <div>
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <p className="text-xs text-gray-600">{task.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">{formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <ProgressTracker
                milestones={milestones}
                overallProgress={65}
                projectTitle="Current Project Progress"
              />
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">{project.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{project.completionRate}%</span>
                      </div>
                      <Progress value={project.completionRate} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <Users className="h-4 w-4 inline mr-1" />
                        {project.studentsAssigned} students
                      </div>
                      <Badge variant="outline">
                        Due {formatDate(project.nextDeadline)}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Button variant="outline" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full text-blue-600 border-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setShowProjectManagement(true);
                        }}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Manage Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getTaskIcon(task.type)}
                        <div>
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <p className="text-sm text-gray-600">{task.description}</p>
                          {task.projectTitle && (
                            <p className="text-xs text-blue-600 mt-1">{task.projectTitle}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <span className="text-sm text-gray-500">Due {formatDate(task.dueDate)}</span>
                        <Button size="sm">
                          Complete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Class Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">87%</div>
                      <div className="text-sm text-gray-600">Average Completion Rate</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-blue-600">156</div>
                        <div className="text-xs text-gray-600">Submissions</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-purple-600">89</div>
                        <div className="text-xs text-gray-600">Credentials</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Sarah completed Digital Portfolio milestone</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>12 new submissions received</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>3 badges ready for approval</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Project Management Modal */}
      {selectedProjectId && (
        <ProjectManagementModal
          projectId={selectedProjectId}
          isOpen={showProjectManagement}
          onClose={() => {
            setShowProjectManagement(false);
            setSelectedProjectId(null);
          }}
        />
      )}
    </div>
  );
}