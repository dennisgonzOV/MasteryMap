import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import Navigation from "@/components/navigation";
import ProjectCard from "@/components/project-card";
import ProgressBar from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BookOpen,
  Clock,
  CheckCircle,
  Calendar,
  Target,
  FileText,
  Users
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function StudentProjects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
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
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch student projects
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
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
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [projectsError, toast]);

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

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return projects.filter(p => p.status === status).length;
  };

  // Mock project assignments with detailed progress
  const projectAssignments = projects.map(project => ({
    ...project,
    myProgress: Math.random() * 100,
    myRole: "Team Member",
    nextMilestone: "Research Phase",
    nextDeadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    totalMilestones: Math.floor(Math.random() * 6) + 4,
    completedMilestones: Math.floor(Math.random() * 3) + 1,
    pendingSubmissions: Math.floor(Math.random() * 3),
  }));

  const filteredAssignments = projectAssignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Projects
            </h1>
            <p className="text-gray-600">
              Track your progress, complete milestones, and submit your work.
            </p>
          </div>

          {/* Project Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                    <Target className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Milestones</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {projectAssignments.reduce((sum, p) => sum + p.completedMilestones, 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Pending</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {projectAssignments.reduce((sum, p) => sum + p.pendingSubmissions, 0)}
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects List */}
          {projectsLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <Card className="apple-shadow border-0">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-2 bg-gray-200 rounded w-full"></div>
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded w-40"></div>
                          <div className="h-8 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchQuery || statusFilter !== "all" ? "No projects match your filters" : "No projects assigned"}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search criteria or filters to find what you're looking for."
                  : "Your teacher will assign projects for you to work on. Check back later!"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredAssignments.map((assignment) => (
                <Card key={assignment.id} className="apple-shadow border-0 card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.title}
                          </h3>
                          <Badge 
                            className={
                              assignment.status === 'active' ? 'bg-green-100 text-green-800' :
                              assignment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {assignment.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{assignment.description}</p>
                        <p className="text-sm text-blue-600 mb-4">My Role: {assignment.myRole}</p>
                      </div>
                      <Button 
                        className="bg-blue-600 text-white hover:bg-blue-700 btn-primary"
                      >
                        Continue Project
                      </Button>
                    </div>

                    {/* Progress Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">My Progress</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(assignment.myProgress)}%
                        </span>
                      </div>
                      <ProgressBar 
                        value={assignment.myProgress} 
                        size="sm"
                        className="mb-3"
                      />
                    </div>

                    {/* Project Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Target className="h-4 w-4" />
                        <span>
                          {assignment.completedMilestones} of {assignment.totalMilestones} milestones
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Next: {format(assignment.nextDeadline, 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        <span>
                          {assignment.pendingSubmissions} pending submissions
                        </span>
                      </div>
                    </div>

                    {/* Next Milestone */}
                    {assignment.status === 'active' && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              Next Milestone: {assignment.nextMilestone}
                            </p>
                            <p className="text-xs text-blue-700">
                              Due {format(assignment.nextDeadline, 'EEEE, MMM d')}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-200">
                            View Details
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Show results count */}
          {!projectsLoading && filteredAssignments.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Showing {filteredAssignments.length} of {projectAssignments.length} projects
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
