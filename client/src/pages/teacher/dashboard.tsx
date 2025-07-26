import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import Navigation from "@/components/navigation";
import ProjectCard from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Users, 
  CheckCircle, 
  Award,
  Plus,
  TrendingUp,
  Clock,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import ProjectCreationModal from "@/components/modals/project-creation-modal-new";
import ProjectManagementModal from "@/components/modals/project-management-modal";
import StudentProgressView from "@/components/student-progress-view";

export default function TeacherDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showStudentProgress, setShowStudentProgress] = useState(false);

  const { isNetworkError, isAuthError, hasError } = useAuth();

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

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && user?.role === 'teacher',
    retry: false,
  });

  // Fetch credentials for stats
  const { data: credentials = [] } = useQuery({
    queryKey: ["/api/credentials/teacher-stats"],
    enabled: isAuthenticated && user?.role === 'teacher',
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
      setLocation("/login");
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

  if (!isAuthenticated || user?.role !== 'teacher') {
    return null;
  }

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalStudents = projects.reduce((sum, project) => sum + (project.studentCount || 0), 0);
  const pendingGrades = 8; // This would come from submissions API
  const credentialsAwarded = credentials.length || 45;

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
              Manage your projects, track student progress, and create engaging learning experiences.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{activeProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Students</p>
                    <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Grades</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingGrades}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Credentials Awarded</p>
                    <p className="text-2xl font-bold text-gray-900">{credentialsAwarded}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            {/* Student Progress Overview Card */}
            <div>
              <Card className="apple-shadow border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Student Progress Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 overflow-hidden">
                    <StudentProgressView />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowStudentProgress(true)}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Full Progress Overview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          
        </div>
      </main>

      {/* Project Creation Modal */}
      <ProjectCreationModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSuccess={() => {
          console.log('Project created successfully');
          setShowCreateProject(false);
        }}
      />

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

      {/* Student Progress Modal */}
      {showStudentProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Student Progress Overview</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStudentProgress(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="sr-only">Close</span>
                ✕
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <StudentProgressView />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
