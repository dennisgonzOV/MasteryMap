import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  GraduationCap,
  Target,
  CheckCircle,
  FileText,
  Calendar,
  Users,
  Sparkles,
  Share2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getProjectThumbnailUrl, handleProjectThumbnailError } from "@/lib/project-thumbnail";

interface Milestone {
  id: number;
  title: string;
  description: string | null;
  order: number;
  dueDate: string | null;
}

interface ComponentSkill {
  id: number;
  name: string;
  description: string | null;
}

interface BestStandard {
  id: number;
  benchmarkNumber: string;
  description: string;
  subject: string | null;
  grade: string | null;
}

interface PublicProject {
  id: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  subjectArea: string | null;
  gradeLevel: string | null;
  estimatedDuration: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
  milestones: Milestone[];
  componentSkills: ComponentSkill[];
  bestStandards: BestStandard[];
}

export default function PublicProjectDetail() {
  const [match, params] = useRoute("/explore/project/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectId = params?.id;

  const { data: project, isLoading, error } = useQuery<PublicProject>({
    queryKey: ['/api/projects/public', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/public/${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch project');
      }
      const data = await response.json();
      return data.data || data;
    },
    enabled: !!projectId,
  });

  if (!match) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
        </nav>
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-64 w-full rounded-lg mb-4" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-full mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/">
                <h1 className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
                  MasteryMap
                </h1>
              </Link>
            </div>
          </div>
        </nav>
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Project Not Found</h3>
            <p className="text-gray-500 mb-4">
              This project may not exist or is not publicly available.
            </p>
            <Button onClick={() => setLocation("/explore")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Explorer
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const sortedMilestones = [...(project.milestones || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <h1 className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
                  MasteryMap
                </h1>
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-lg font-medium text-gray-700">Project Explorer</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setLocation("/login")}>
                Sign In
              </Button>
              <Button onClick={() => setLocation("/register")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation("/explore")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Explorer
        </Button>
        <Button
          variant="outline"
          className="mb-6 float-right"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast({
              title: "Link copied",
              description: "Project link copied to clipboard",
            });
          }}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>

        <Card className="overflow-hidden">
          <div className="aspect-[21/9] bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
            <img
              src={getProjectThumbnailUrl(project.thumbnailUrl)}
              alt={project.title}
              className="w-full h-full object-cover"
              onError={handleProjectThumbnailError}
            />
          </div>

          <CardHeader className="pb-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {project.subjectArea && (
                <Badge variant="secondary">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {project.subjectArea}
                </Badge>
              )}
              {project.gradeLevel && (
                <Badge variant="outline">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {project.gradeLevel === 'K' ? 'Kindergarten' : `Grade ${project.gradeLevel}`}
                </Badge>
              )}
              {project.estimatedDuration && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {project.estimatedDuration}
                </Badge>
              )}
            </div>
            <CardTitle className="text-3xl">{project.title}</CardTitle>
            {project.description && (
              <CardDescription className="text-base mt-2">
                {project.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-8">
            {project.componentSkills && project.componentSkills.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  XQ Competency Skills
                </h3>
                <div className="grid gap-3">
                  {project.componentSkills.map(skill => (
                    <div
                      key={skill.id}
                      className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                    >
                      <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{skill.name}</p>
                        {skill.description && (
                          <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {project.bestStandards && project.bestStandards.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  B.E.S.T. Standards
                </h3>
                <div className="grid gap-3">
                  {project.bestStandards.map(standard => (
                    <div
                      key={standard.id}
                      className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg"
                    >
                      <CheckCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{standard.benchmarkNumber}</p>
                        <p className="text-sm text-gray-600 mt-1">{standard.description}</p>
                        <div className="flex gap-2 mt-2">
                          {standard.subject && (
                            <Badge variant="outline" className="text-xs">
                              {standard.subject}
                            </Badge>
                          )}
                          {standard.grade && (
                            <Badge variant="outline" className="text-xs">
                              {standard.grade}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {sortedMilestones.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Project Milestones
                </h3>
                <div className="space-y-4">
                  {sortedMilestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Want to Use This Project?
              </h3>
              <p className="text-gray-600 mb-4">
                Sign up for MasteryMap to create your own version of this project and track student progress.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setLocation("/register")}>
                  Create Free Account
                </Button>
                <Button variant="outline" onClick={() => setLocation("/login")}>
                  Sign In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
