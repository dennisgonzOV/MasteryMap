import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Download,
  GraduationCap,
  Target,
  CheckCircle,
  FileText,
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
  name: string | null;
  competencyId: number | null;
  competencyName?: string | null;
  competencyDescription?: string | null;
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

function ContentSection({
  title,
  helperText,
  icon,
  children,
}: {
  title: string;
  helperText: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xl font-semibold mb-2 flex items-center gap-2 text-gray-900">
        {icon}
        {title}
      </h3>
      <p className="text-sm italic text-blue-700/80 mb-4">{helperText}</p>
      {children}
    </section>
  );
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

  const groupedCompetencySkills = useMemo(() => {
    const groups = new Map<number, {
      competencyId: number;
      competencyName: string;
      competencyDescription: string | null;
      skills: ComponentSkill[];
    }>();

    for (const skill of project?.componentSkills || []) {
      const competencyId = skill.competencyId ?? 0;
      const competencyName = skill.competencyName?.trim() || "Uncategorized Competency";

      const existingGroup = groups.get(competencyId);
      if (existingGroup) {
        existingGroup.skills.push(skill);
        continue;
      }

      groups.set(competencyId, {
        competencyId,
        competencyName,
        competencyDescription: skill.competencyDescription ?? null,
        skills: [skill],
      });
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        skills: [...group.skills].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      }))
      .sort((a, b) => a.competencyName.localeCompare(b.competencyName));
  }, [project?.componentSkills]);

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

  const handleShareProject = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: project.title,
          text: "Check out this project from the MasteryMap Project Explorer.",
          url: window.location.href,
        });
        return;
      }
    } catch {
      // Fall back to clipboard copy below
    }

    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Project link copied to clipboard",
    });
  };

  const handleDownloadPdf = () => {
    window.print();
    toast({
      title: "Print dialog opened",
      description: "Choose 'Save as PDF' in your browser to download.",
    });
  };

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
          className="mb-4"
          onClick={() => setLocation("/explore")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Explorer
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

          <CardHeader className="pb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {project.gradeLevel && (
                <Badge variant="secondary" className="bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {project.gradeLevel === 'K' ? 'Kindergarten' : `Grade ${project.gradeLevel}`}
                </Badge>
              )}
              {project.subjectArea && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {project.subjectArea}
                </Badge>
              )}
              {project.estimatedDuration && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {project.estimatedDuration}
                </Badge>
              )}
            </div>
            <CardTitle className="text-4xl leading-tight">{project.title}</CardTitle>
            {project.description && (
              <CardDescription className="text-xl leading-relaxed mt-4 text-gray-700">
                {project.description}
              </CardDescription>
            )}
            <div className="flex flex-wrap gap-3 mt-6">
              <Button size="lg" onClick={() => setLocation("/register")}>
                Use This Project
              </Button>
              <Button variant="outline" size="lg" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="lg" onClick={handleShareProject}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {groupedCompetencySkills.length > 0 && (
              <ContentSection
                title="XQ Competency Skills"
                helperText="Skills are grouped by competency to show how each cluster supports deeper learning outcomes."
                icon={<Target className="h-5 w-5 text-blue-600" />}
              >
                <div className="grid gap-4">
                  {groupedCompetencySkills.map((group) => (
                    <Card key={group.competencyId} className="border-blue-100 bg-blue-50/60">
                      <CardContent className="p-5">
                        <h4 className="text-lg font-semibold text-gray-900">{group.competencyName}</h4>
                        {group.competencyDescription && (
                          <p className="text-sm text-gray-700 mt-1">{group.competencyDescription}</p>
                        )}
                        <div className="grid gap-2 mt-4">
                          {group.skills.map((skill) => (
                            <div key={skill.id} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                              <p className="text-sm text-gray-800">{skill.name || "Unnamed Skill"}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ContentSection>
            )}

            {project.bestStandards && project.bestStandards.length > 0 && (
              <ContentSection
                title="B.E.S.T. Standards"
                helperText="These standards identify the specific benchmark targets this project supports."
                icon={<BookOpen className="h-5 w-5 text-indigo-600" />}
              >
                <div className="grid gap-3">
                  {project.bestStandards.map((standard) => (
                    <Card key={standard.id} className="border-indigo-100 bg-indigo-50/50">
                      <CardContent className="p-4 flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{standard.benchmarkNumber}</p>
                          <p className="text-sm text-gray-700 mt-1">{standard.description}</p>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ContentSection>
            )}

            {sortedMilestones.length > 0 && (
              <ContentSection
                title="Project Milestones"
                helperText="A sequenced pathway showing the major phases of the project from start to finish."
                icon={<Sparkles className="h-5 w-5 text-purple-600" />}
              >
                <div className="grid gap-3">
                  {sortedMilestones.map((milestone, index) => (
                    <Card key={milestone.id} className="border-purple-100 bg-white">
                      <CardContent className="p-4 flex gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                          {milestone.description && (
                            <p className="text-sm text-gray-700 mt-1">{milestone.description}</p>
                          )}
                          {milestone.dueDate && (
                            <p className="text-xs text-gray-500 mt-2">
                              Due {new Date(milestone.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ContentSection>
            )}

            <ContentSection
              title="Want to Use This Project?"
              helperText="Bring this project into your classroom and adapt it to your learners."
              icon={<Users className="h-5 w-5 text-blue-600" />}
            >
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100">
                <CardContent className="p-6">
                  <p className="text-gray-700 mb-4">
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
                </CardContent>
              </Card>
            </ContentSection>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
