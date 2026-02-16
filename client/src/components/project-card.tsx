import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { Project } from "@shared/schema";
import { getProjectThumbnailUrl, handleProjectThumbnailError } from "@/lib/project-thumbnail";

interface ProjectCardProps {
  project: Project;
  progress?: number;
  studentCount?: number;
  onViewProject?: (projectId: number) => void;
  userRole?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
}

export default function ProjectCard({ 
  project, 
  progress = 0, 
  studentCount = 0,
  onViewProject,
  userRole,
  actionLabel,
  actionDisabled = false,
}: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <ComponentErrorBoundary componentName="Project Card" showError={true}>
      <Card className="card-hover apple-shadow border-0 overflow-hidden">
        {/* Project Thumbnail */}
        <div className="relative h-40 w-full overflow-hidden bg-gray-100">
          <img
            src={getProjectThumbnailUrl(project.thumbnailUrl)}
            alt={`${project.title} thumbnail`}
            className="w-full h-full object-cover"
            onError={handleProjectThumbnailError}
          />
          <Badge className={`absolute top-2 right-2 ${getStatusColor(project.status || 'draft')}`}>
            {project.status || 'Draft'}
          </Badge>
        </div>
        <CardContent className="p-6">
        {/* Project Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
              {project.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {project.description}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Progress</span>
            <span className="text-xs font-medium text-gray-900">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Project Meta */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          {project.dueDate && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Due: {format(new Date(project.dueDate), 'MMM d')}</span>
            </div>
          )}
          {userRole === 'teacher' && studentCount !== undefined && (
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>{studentCount} students</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button 
          onClick={() => onViewProject?.(project.id)}
          disabled={actionDisabled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white btn-primary"
        >
          {actionLabel ?? (userRole === 'teacher' ? 'Manage Project' : 'View Project')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        </CardContent>
      </Card>
    </ComponentErrorBoundary>
  );
}
