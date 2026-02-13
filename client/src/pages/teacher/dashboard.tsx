import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import { useAuthErrorHandling, useQueryErrorHandling } from "@/hooks/useErrorHandling";
import { FullscreenLoader } from "@/components/ui/loading-spinner";
import Navigation from "@/components/navigation";
import ProjectCard from "@/components/project-card";
import NotificationSystem from "@/components/notification-system";
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
  AlertCircle,
  BarChart3
} from "lucide-react";
import { useState } from "react";
import ProjectCreationModal from "@/components/modals/project-creation-modal-new";
import ProjectManagementModal from "@/components/modals/project-management-modal";
import StudentProgressView from "@/components/student-progress-view";
import SchoolSkillsTracker from "@/components/school-skills-tracker";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CredentialDTO, ProjectDTO } from "@shared/contracts/api";

type TeacherDashboardProject = ProjectDTO & {
  studentCount?: number | null;
};

export default function TeacherDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showStudentProgress, setShowStudentProgress] = useState(false);

  const { isNetworkError, isAuthError, hasError } = useAuth();

  // Use centralized error handling
  useAuthErrorHandling(isLoading, isAuthenticated, { isNetworkError, isAuthError, hasError });

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery<TeacherDashboardProject[]>({
    queryKey: ["/api/projects"],
    queryFn: api.getProjects,
    enabled: isAuthenticated && user?.role === 'teacher',
    retry: false,
  });

  // Fetch credentials for stats
  const { data: credentials = [] } = useQuery<CredentialDTO[]>({
    queryKey: ["/api/credentials/teacher-stats"],
    queryFn: api.getTeacherCredentialStats,
    enabled: isAuthenticated && user?.role === 'teacher',
    retry: false,
  });

  // Handle query errors
  useQueryErrorHandling(projectsError as Error);

  if (isLoading) {
    return <FullscreenLoader text="Loading..." />;
  }

  if (!isAuthenticated || user?.role !== 'teacher') {
    return null;
  }

  const activeProjects = projects.filter((project) => project.status === 'active').length;
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user.username}!
                </h1>
                <p className="text-gray-600">
                  Manage your projects, track student progress, and create engaging learning experiences.
                </p>
              </div>
              <NotificationSystem userId={user.id} userRole="teacher" />
            </div>
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
                  <div className="h-[600px]">
                    <ScrollArea className="h-full w-full">
                      <div className="space-y-6 pr-4">
                        {/* Search and student list without header */}
                        <StudentProgressView />
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* School Skills Tracker Card */}
            <div>
              <Card className="apple-shadow border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    School Skills Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[700px]">
                    <ScrollArea className="h-full w-full">
                      <div className="space-y-6 pr-4">
                        <SchoolSkillsTracker />
                      </div>
                    </ScrollArea>
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
