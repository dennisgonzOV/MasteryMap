import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Grid,
  List,
  Target,
  FileText,
  X
} from "lucide-react";
import { getProjectThumbnailUrl, handleProjectThumbnailError } from "@/lib/project-thumbnail";

interface Project {
  id: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  subjectArea: string | null;
  gradeLevel: string | null;
  estimatedDuration: string | null;
  componentSkillIds: number[] | null;
  bestStandardIds: number[] | null;
  bestStandards?: { id: number; benchmarkNumber: string; description: string }[];
  createdAt: string;
}

interface FilterOptions {
  subjectAreas: string[];
  gradeLevels: string[];
  durations: string[];
  competencyFrameworks: any[];
}

interface Competency {
  id: number;
  name: string;
  componentSkills: { id: number; name: string }[];
}

interface LearnerOutcome {
  id: number;
  name: string;
  competencies: Competency[];
}

export default function ProjectExplorer() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<number>>(new Set());
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<number>>(new Set());
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: filterOptions, isLoading: filtersLoading, error: filtersError } = useQuery<FilterOptions>({
    queryKey: ['/api/projects/public-filters'],
  });

  const normalizeFilterValue = (value: string) => (value === "all" ? "" : value);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedSubject) params.set('subjectArea', selectedSubject);
    if (selectedGrade) params.set('gradeLevel', selectedGrade);
    if (selectedDuration) params.set('estimatedDuration', selectedDuration);
    if (selectedSkillIds.size > 0) {
      params.set('componentSkillIds', Array.from(selectedSkillIds).join(','));
    }
    return params.toString();
  };

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ['/api/projects/public', buildQueryString()],
    queryFn: async () => {
      const queryString = buildQueryString();
      const url = `/api/projects/public${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.data || data;
    }
  });

  const toggleOutcome = (outcomeId: number) => {
    setExpandedOutcomes(prev => {
      const next = new Set(prev);
      if (next.has(outcomeId)) {
        next.delete(outcomeId);
      } else {
        next.add(outcomeId);
      }
      return next;
    });
  };

  const toggleCompetency = (competencyId: number) => {
    setExpandedCompetencies(prev => {
      const next = new Set(prev);
      if (next.has(competencyId)) {
        next.delete(competencyId);
      } else {
        next.add(competencyId);
      }
      return next;
    });
  };

  const toggleSkill = (skillId: number) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSubject("");
    setSelectedGrade("");
    setSelectedDuration("");
    setSelectedSkillIds(new Set());
  };

  const hasActiveFilters = searchTerm || selectedSubject || selectedGrade || selectedDuration || selectedSkillIds.size > 0;

  const getGradeLevelLabel = (grade: string) => {
    if (grade === 'K') return 'Kindergarten';
    return `Grade ${grade}`;
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

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Explore Public Projects</h2>
          <p className="text-gray-600">
            Discover and learn from projects shared by educators in our community.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className={`lg:w-80 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <BookOpen className="h-4 w-4" />
                    Subject Area
                  </Label>
                  <Select value={selectedSubject} onValueChange={(value) => setSelectedSubject(normalizeFilterValue(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {filterOptions?.subjectAreas?.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <GraduationCap className="h-4 w-4" />
                    Grade Level
                  </Label>
                  <Select value={selectedGrade} onValueChange={(value) => setSelectedGrade(normalizeFilterValue(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {filterOptions?.gradeLevels?.map(grade => (
                        <SelectItem key={grade} value={grade}>{getGradeLevelLabel(grade)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Duration
                  </Label>
                  <Select value={selectedDuration} onValueChange={(value) => setSelectedDuration(normalizeFilterValue(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Duration</SelectItem>
                      {filterOptions?.durations?.map(duration => (
                        <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4" />
                    XQ Competencies
                  </Label>
                  <ScrollArea className="h-64 border rounded-md p-2">
                    {filtersLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ) : filtersError ? (
                      <p className="text-xs text-red-600 px-2 py-1">
                        Competency filters are temporarily unavailable.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {(filterOptions?.competencyFrameworks as LearnerOutcome[] || []).map(outcome => (
                          <div key={outcome.id} className="space-y-1">
                            <button
                              onClick={() => toggleOutcome(outcome.id)}
                              className="flex items-center gap-2 w-full text-left py-1 px-2 hover:bg-gray-100 rounded text-sm font-medium"
                            >
                              {expandedOutcomes.has(outcome.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {outcome.name}
                            </button>
                            {expandedOutcomes.has(outcome.id) && (
                              <div className="ml-4 space-y-1">
                                {outcome.competencies?.map(comp => (
                                  <div key={comp.id}>
                                    <button
                                      onClick={() => toggleCompetency(comp.id)}
                                      className="flex items-center gap-2 w-full text-left py-1 px-2 hover:bg-gray-100 rounded text-xs text-gray-700"
                                    >
                                      {expandedCompetencies.has(comp.id) ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                      {comp.name}
                                    </button>
                                    {expandedCompetencies.has(comp.id) && (
                                      <div className="ml-4 space-y-1">
                                        {comp.componentSkills?.map(skill => (
                                          <label
                                            key={skill.id}
                                            className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                                          >
                                            <Checkbox
                                              checked={selectedSkillIds.has(skill.id)}
                                              onCheckedChange={() => toggleSkill(skill.id)}
                                            />
                                            <span className="text-xs text-gray-600">{skill.name}</span>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <span className="text-sm text-gray-500">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {projectsError ? (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Unable to Load Projects</h3>
                <p className="text-gray-500 mb-4">
                  We couldn't load public projects right now. Please refresh and try again.
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </Card>
            ) : projectsLoading ? (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-40 w-full rounded-md mb-4" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardFooter>
                      <Skeleton className="h-8 w-24" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Projects Found</h3>
                <p className="text-gray-500 mb-4">
                  {hasActiveFilters
                    ? "Try adjusting your filters to find more projects."
                    : "No public projects are available yet."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                )}
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map(project => (
                  <ProjectListItem key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
        <img
          src={getProjectThumbnailUrl(project.thumbnailUrl)}
          alt={project.title}
          className="w-full h-full object-cover"
          onError={handleProjectThumbnailError}
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
          {project.title}
        </CardTitle>
        {project.description && (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2">
          {project.subjectArea && (
            <Badge variant="secondary" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              {project.subjectArea}
            </Badge>
          )}
          {project.gradeLevel && (
            <Badge variant="outline" className="text-xs">
              <GraduationCap className="h-3 w-3 mr-1" />
              {project.gradeLevel === 'K' ? 'Kindergarten' : `Grade ${project.gradeLevel}`}
            </Badge>
          )}
          {project.estimatedDuration && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {project.estimatedDuration}
            </Badge>
          )}
          {project.bestStandards && project.bestStandards.slice(0, 3).map(standard => (
            <Badge key={standard.id} variant="secondary" className="text-xs bg-orange-100 text-orange-800 hover:bg-orange-200">
              <Target className="h-3 w-3 mr-1" />
              {standard.benchmarkNumber}
            </Badge>
          ))}
          {project.bestStandards && project.bestStandards.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{project.bestStandards.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/explore/project/${project.id}`}>
          <Button variant="outline" size="sm" className="w-full">
            View Project
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function ProjectListItem({ project }: { project: Project }) {
  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <div className="flex gap-4 p-4">
        <div className="w-40 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg shrink-0 overflow-hidden">
          <img
            src={getProjectThumbnailUrl(project.thumbnailUrl)}
            alt={project.title}
            className="w-full h-full object-cover"
            onError={handleProjectThumbnailError}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
            {project.title}
          </h3>
          {project.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {project.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {project.subjectArea && (
              <Badge variant="secondary" className="text-xs">
                {project.subjectArea}
              </Badge>
            )}
            {project.gradeLevel && (
              <Badge variant="outline" className="text-xs">
                {project.gradeLevel === 'K' ? 'Kindergarten' : `Grade ${project.gradeLevel}`}
              </Badge>
            )}
            {project.estimatedDuration && (
              <Badge variant="outline" className="text-xs">
                {project.estimatedDuration}
              </Badge>
            )}
            {project.bestStandards && project.bestStandards.slice(0, 3).map(standard => (
              <Badge key={standard.id} variant="secondary" className="text-xs bg-orange-100 text-orange-800 hover:bg-orange-200">
                {standard.benchmarkNumber}
              </Badge>
            ))}
            {project.bestStandards && project.bestStandards.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{project.bestStandards.length - 3} more
              </Badge>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <Link href={`/explore/project/${project.id}`}>
            <Button variant="outline" size="sm">
              View
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
