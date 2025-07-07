import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import Navigation from "@/components/navigation";
import ProjectCard from "@/components/project-card";
import CredentialBadge from "@/components/credential-badge";
import ProgressBar from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Trophy
} from "lucide-react";

export default function StudentDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch student projects
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  // Fetch student credentials
  const { data: credentials = [], isLoading: credentialsLoading } = useQuery({
    queryKey: ["/api/credentials/student"],
    enabled: isAuthenticated && user?.role === 'student',
    retry: false,
  });

  // Fetch portfolio artifacts
  const { data: artifacts = [] } = useQuery({
    queryKey: ["/api/portfolio/artifacts"],
    enabled: isAuthenticated && user?.role === 'student',
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

  if (!isAuthenticated || user?.role !== 'student') {
    return null;
  }

  // Mock competency progress data
  const competencyProgress = [
    {
      id: 1,
      name: "Critical Thinking",
      progress: 78,
      level: "Proficient",
      color: "blue",
      icon: Brain,
      lastUpdated: "2 days ago"
    },
    {
      id: 2,
      name: "Collaboration",
      progress: 92,
      level: "Applying",
      color: "green",
      icon: Users,
      lastUpdated: "1 week ago"
    },
    {
      id: 3,
      name: "Communication",
      progress: 65,
      level: "Developing",
      color: "yellow",
      icon: Target,
      lastUpdated: "3 days ago"
    }
  ];

  // Mock upcoming deadlines
  const upcomingDeadlines = [
    {
      id: 1,
      title: "Climate Research Report",
      project: "Sustainable Cities Project",
      dueDate: "Tomorrow",
      priority: "high"
    },
    {
      id: 2,
      title: "App Prototype Demo",
      project: "Digital Innovation Lab",
      dueDate: "In 3 days",
      priority: "medium"
    },
    {
      id: 3,
      title: "History Presentation",
      project: "History Through Stories",
      dueDate: "Next week",
      priority: "low"
    }
  ];

  const recentCredentials = credentials.slice(0, 3);
  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user.firstName}!
            </h1>
            <p className="text-gray-600">
              Continue your learning journey and track your progress across all projects.
            </p>
          </div>

          {/* Learning Progress Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Competency Progress */}
            <div className="lg:col-span-2">
              <Card className="apple-shadow border-0">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span>My Learning Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {competencyProgress.map((competency) => {
                    const Icon = competency.icon;
                    return (
                      <div key={competency.id} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 bg-${competency.color}-600 rounded-full flex items-center justify-center`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{competency.name}</h4>
                              <p className="text-sm text-gray-600">XQ Competency</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">{competency.progress}%</div>
                            <div className="text-sm text-gray-600">{competency.level}</div>
                          </div>
                        </div>
                        <ProgressBar 
                          value={competency.progress} 
                          color={competency.color as any}
                          size="sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">Last updated {competency.lastUpdated}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Achievements */}
              <Card className="apple-shadow border-0">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    <span>Recent Achievements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {credentialsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-1">
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentCredentials.length === 0 ? (
                    <div className="text-center py-6">
                      <Star className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No achievements yet</p>
                      <p className="text-xs text-gray-500">Complete projects to earn credentials</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentCredentials.map((credential) => (
                        <CredentialBadge key={credential.id} credential={credential} showDetails />
                      ))}
                      {credentials.length > 3 && (
                        <Link href="/student/portfolio">
                          <Button variant="ghost" size="sm" className="w-full mt-2">
                            View All Achievements
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card className="apple-shadow border-0">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span>Upcoming Deadlines</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingDeadlines.map((deadline) => (
                      <div key={deadline.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className={`w-2 h-2 rounded-full ${
                          deadline.priority === 'high' ? 'bg-red-500' :
                          deadline.priority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{deadline.title}</p>
                          <p className="text-xs text-gray-600">{deadline.project}</p>
                          <p className="text-xs text-gray-500">{deadline.dueDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* My Projects */}
          <Card className="apple-shadow border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>My Projects</span>
                </CardTitle>
                <Link href="/student/projects">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-xl h-48"></div>
                    </div>
                  ))}
                </div>
              ) : activeProjects.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active projects</h3>
                  <p className="text-gray-600">
                    Your teacher will assign projects for you to work on.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeProjects.slice(0, 4).map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      progress={Math.random() * 100} // This would come from actual progress calculation
                      userRole="student"
                      onViewProject={(id) => console.log('View project', id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/student/projects">
              <Card className="apple-shadow border-0 card-hover cursor-pointer">
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">View Projects</h3>
                  <p className="text-sm text-gray-600">See all your assigned projects and milestones</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/student/portfolio">
              <Card className="apple-shadow border-0 card-hover cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Award className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">My Portfolio</h3>
                  <p className="text-sm text-gray-600">Showcase your work and achievements</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="apple-shadow border-0 card-hover cursor-pointer">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Credentials</h3>
                <p className="text-sm text-gray-600">Track your badges, stickers, and plaques</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
