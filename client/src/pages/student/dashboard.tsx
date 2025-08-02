import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import Navigation from "@/components/navigation";
import ProjectCard from "@/components/project-card";
import CredentialBadge from "@/components/credential-badge";
import ProgressBar from "@/components/progress-bar";
import CompetencyHive from "@/components/competency-hive";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Award, 
  TrendingUp,
  Clock,
  Target,
  Brain,
  Users,
  ArrowRight,
  Star,
  Trophy,
  AlertCircle,
  Hash,
  Calendar,
  CheckCircle,
  Briefcase,
  Folder
} from "lucide-react";

export default function StudentDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user, isNetworkError, isAuthError, hasError } = useAuth();
  const [, setLocation] = useLocation();

  // Handle network errors
  useEffect(() => {
    if (isNetworkError) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    }
  }, [isNetworkError, toast]);

  // Redirect to login if authentication error
  useEffect(() => {
    if (!isLoading && (isAuthError || (!isAuthenticated && !hasError))) {
      if (isAuthError) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
      }
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, isLoading, isAuthError, hasError, setLocation, toast]);

  // Fetch student projects
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && (user as any)?.role === 'student',
    retry: false,
  });

  // Fetch student credentials
  const { data: credentials = [], isLoading: credentialsLoading } = useQuery({
    queryKey: ["/api/credentials/student"],
    enabled: isAuthenticated && (user as any)?.role === 'student',
    retry: false,
  });

  // Fetch portfolio artifacts
  const { data: artifacts = [] } = useQuery({
    queryKey: ["/api/portfolio/artifacts"],
    enabled: isAuthenticated && (user as any)?.role === 'student',
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (projectsError && isUnauthorizedError(projectsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
    }
  }, [projectsError, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.role !== 'student') {
    return null;
  }

  // Use real competency progress data from API
  const { data: competencyProgress = [] } = useQuery({
    queryKey: ["/api/competency-progress/student", (user as any)?.id],
    enabled: isAuthenticated && (user as any)?.role === 'student' && !!(user as any)?.id,
    retry: false,
  });

  // Fetch upcoming deadlines
  const { data: upcomingDeadlines = [] } = useQuery({
    queryKey: ["/api/deadlines/student"],
    enabled: isAuthenticated && (user as any)?.role === 'student',
    retry: false,
  });

  const recentCredentials = Array.isArray(credentials) ? (credentials as any[]).slice(0, 3) : [];
  const activeProjects = Array.isArray(projects) ? (projects as any[]).filter((p: any) => p.status === 'active') : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {(user as any)?.firstName || 'Student'}!
                </h1>
                <p className="text-gray-600">
                  Continue your learning journey and track your progress across all projects.
                </p>
              </div>
              
              {/* Assessment Code Entry */}
              <div className="lg:min-w-0 lg:flex-shrink-0">
                <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 p-3 rounded-full">
                        <Hash className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Join Assessment</h3>
                        <p className="text-white/90 text-sm mb-3">Enter your teacher's 5-letter code</p>
                        <Link href="/student/enter-code">
                          <Button 
                            size="sm" 
                            className="bg-white text-blue-600 hover:bg-white/90 font-medium"
                          >
                            Enter Code
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Left Column - Projects and Tasks */}
            <div className="xl:col-span-2 space-y-6">
              {/* Active Projects */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Briefcase className="h-6 w-6 mr-3 text-blue-600" />
                    My Active Projects
                    {activeProjects.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeProjects.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projectsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-24 bg-gray-200 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : activeProjects.length > 0 ? (
                    <ScrollArea className="h-96">
                      <div className="space-y-4 pr-4">
                        {activeProjects.map((project: any) => (
                          <ProjectCard key={project.id} project={project} />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Projects</h3>
                      <p className="text-gray-600">Check back later for new project assignments.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Calendar className="h-6 w-6 mr-3 text-red-600" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(upcomingDeadlines) && upcomingDeadlines.length > 0 ? (
                    <div className="space-y-3">
                      {(upcomingDeadlines as any[]).slice(0, 5).map((deadline: any, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Clock className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{deadline.title || deadline.name}</p>
                              <p className="text-sm text-gray-600">{deadline.projectTitle}</p>
                            </div>
                          </div>
                          <Badge variant={deadline.priority === 'high' ? 'destructive' : 'secondary'}>
                            {new Date(deadline.dueDate).toLocaleDateString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-600">No upcoming deadlines. You're all caught up!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Stats */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 gap-4">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Active Projects</p>
                        <p className="text-3xl font-bold">{activeProjects.length}</p>
                      </div>
                      <Briefcase className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Credentials Earned</p>
                        <p className="text-3xl font-bold">{Array.isArray(credentials) ? credentials.length : 0}</p>
                      </div>
                      <Award className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Portfolio Items</p>
                        <p className="text-3xl font-bold">{Array.isArray(artifacts) ? artifacts.length : 0}</p>
                      </div>
                      <Folder className="h-8 w-8 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Credentials */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentCredentials.length > 0 ? (
                    <div className="space-y-3">
                      {recentCredentials.map((credential: any) => (
                        <CredentialBadge key={credential.id} credential={credential} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Star className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">No credentials yet. Keep working on your projects!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Competency Hive Section */}
          <Card className="shadow-lg border-0 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Brain className="h-7 w-7 mr-3 text-purple-600" />
                My Competency Hive
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Track your progress across all XQ competencies. Each hexagon represents a different skill area, 
                with colors indicating your mastery level.
              </p>
            </CardHeader>
            <CardContent>
              <CompetencyHive 
                studentId={(user as any)?.id} 
                showProgress={true} 
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/student/projects">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6 text-center">
                  <Briefcase className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">View All Projects</h3>
                  <p className="text-sm text-gray-600">See all your assigned projects</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/student/portfolio">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6 text-center">
                  <Folder className="h-10 w-10 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">My Portfolio</h3>
                  <p className="text-sm text-gray-600">Manage your work artifacts</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/student/credentials">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
                <CardContent className="p-6 text-center">
                  <Award className="h-10 w-10 text-yellow-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Credentials</h3>
                  <p className="text-sm text-gray-600">View earned badges</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/student/enter-code">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6 text-center">
                  <Hash className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Join Assessment</h3>
                  <p className="text-sm text-gray-600">Enter teacher's code</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
