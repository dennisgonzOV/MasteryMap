import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import Navigation from "@/components/navigation";
import ProjectCard from "@/components/project-card";
import ProjectCreationModal from "@/components/modals/project-creation-modal-new";
import ProjectManagementModal from "@/components/modals/project-management-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter, 
  BookOpen,
  Clock,
  CheckCircle,
  Archive
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TeacherProjects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
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

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'archived':
        return <Archive className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getStatusCount = (status: string) => {
    return projects.filter(p => p.status === status).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Projects
              </h1>
              <p className="text-gray-600">
                Create, manage, and track your project-based learning initiatives.
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateProject(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Draft</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {getStatusCount('draft')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {getStatusCount('active')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {getStatusCount('completed')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Archive className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Archived</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {getStatusCount('archived')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="apple-shadow border-0 mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 focus-ring"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="focus-ring">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects Grid */}
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <Card className="apple-shadow border-0">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-2 bg-gray-200 rounded w-full"></div>
                        <div className="h-8 bg-gray-200 rounded w-full"></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchQuery || statusFilter !== "all" ? "No projects match your filters" : "No projects yet"}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search criteria or filters to find what you're looking for."
                  : "Create your first project to start engaging your students with project-based learning."
                }
              </p>
              {(!searchQuery && statusFilter === "all") && (
                <Button 
                  onClick={() => setShowCreateProject(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700 btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  progress={Math.random() * 100} // This would come from actual progress calculation
                  studentCount={Math.floor(Math.random() * 30) + 15} // This would come from actual assignments
                  userRole="teacher"
                  onViewProject={(id) => {
                    setSelectedProjectId(id);
                    setShowProjectManagement(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* Show results count */}
          {!projectsLoading && filteredProjects.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Showing {filteredProjects.length} of {projects.length} projects
              </p>
            </div>
          )}
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
    </div>
  );
}
