import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Users,
  Award,
  GraduationCap,
  Star,
  Trophy,
  Medal,
  FolderOpen,
  BarChart3,
} from 'lucide-react';
import { CompetencyProgress } from "@/components/competency-progress";

interface StudentProgress {
  id: number;
  username: string;
  grade: string | null;
  projects: Array<{
    projectId: number;
    projectTitle: string;
    projectDescription: string;
    projectStatus: string;
    teacherName: string;
  }>;
  credentials: Array<{
    id: number;
    title: string;
    description: string;
    type: 'sticker' | 'badge' | 'plaque';
    awardedAt: string;
  }>;
  competencyProgress: Array<{
    competencyId: number;
    competencyName: string;
    componentSkillId: number;
    componentSkillName: string;
    averageScore: number;
    submissionCount: number;
  }>;
  totalCredentials: number;
  stickers: number;
  badges: number;
  plaques: number;
}

const ALL_GRADES_FILTER = "__all__";

function normalizeGradeLabel(grade: string | null | undefined): string {
  const normalized = (grade ?? "").trim();
  if (!normalized) return "Unassigned";

  const lower = normalized.toLowerCase();
  if (lower === "k" || lower.includes("kindergarten")) {
    return "K";
  }

  const numericMatch = lower.match(/\b([0-9]{1,2})(?:st|nd|rd|th)?\b/);
  if (numericMatch) {
    return String(Number.parseInt(numericMatch[1], 10));
  }

  return normalized;
}

export default function StudentProgressView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>(ALL_GRADES_FILTER);
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);

  const { data: studentsProgress = [], isLoading } = useQuery<StudentProgress[]>({
    queryKey: ["/api/schools/students-progress"],
    retry: false,
  });

  const gradeOptions = useMemo(() => {
    return Array.from(
      new Set(studentsProgress.map((student: StudentProgress) => normalizeGradeLabel(student.grade))),
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }, [studentsProgress]);

  const filteredStudents = studentsProgress.filter((student: StudentProgress) => {
    const matchesSearch = student.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade =
      selectedGrade === ALL_GRADES_FILTER || normalizeGradeLabel(student.grade) === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  useEffect(() => {
    if (selectedStudent && !filteredStudents.some((student) => student.id === selectedStudent.id)) {
      setSelectedStudent(null);
    }
  }, [filteredStudents, selectedStudent?.id]);

  const getCredentialIcon = (type: string) => {
    switch (type) {
      case 'sticker':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'badge':
        return <Medal className="h-4 w-4 text-blue-500" />;
      case 'plaque':
        return <Trophy className="h-4 w-4 text-purple-500" />;
      default:
        return <Award className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search students by username..."
              className="pl-10"
              value=""
              readOnly
              disabled
            />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-3 lg:col-span-2">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search students by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GRADES_FILTER}>All grades</SelectItem>
            {gradeOptions.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Students List */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900">Students</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[28rem] overflow-y-auto pt-0">
              <div className="space-y-2 pb-1">
                {filteredStudents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/70 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {searchTerm || selectedGrade !== ALL_GRADES_FILTER
                        ? 'No students match your filters.'
                        : 'No students are available yet.'}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {searchTerm || selectedGrade !== ALL_GRADES_FILTER
                        ? 'Try another username, choose a different grade, or clear filters.'
                        : 'Students will appear here once they are enrolled.'}
                    </p>
                    {(searchTerm || selectedGrade !== ALL_GRADES_FILTER) && (
                      <div className="mt-3 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedGrade(ALL_GRADES_FILTER);
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredStudents.map((student: StudentProgress) => {
                    const isSelected = selectedStudent?.id === student.id;

                    return (
                      <div
                        key={student.id}
                        className={`relative cursor-pointer overflow-hidden rounded-lg border p-3 transition-all ${
                          isSelected
                            ? 'border-blue-300 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        {isSelected && <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" />}
                        <div className={`flex items-center gap-3 ${isSelected ? 'pl-1' : ''}`}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {student.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {student.username}
                            </h4>
                            <p className="text-xs text-gray-600">{normalizeGradeLabel(student.grade)}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              isSelected ? 'border-blue-200 bg-blue-100 text-blue-800' : 'text-gray-600'
                            }`}
                          >
                            {student.totalCredentials}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Details */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <Tabs defaultValue="overview" className="space-y-3">
              <TabsList className="grid h-11 w-full grid-cols-3 rounded-lg bg-gray-100 p-1">
                <TabsTrigger
                  value="overview"
                  className="font-semibold text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="projects"
                  className="font-semibold text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  Projects
                </TabsTrigger>
                <TabsTrigger
                  value="competencies"
                  className="font-semibold text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  Competencies
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-3">
                {/* Student Header */}
                <Card className="rounded-xl border-gray-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="text-base font-medium">
                          {selectedStudent.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedStudent.username}
                        </h2>
                        <p className="text-sm font-medium text-gray-700">{normalizeGradeLabel(selectedStudent.grade)}</p>
                        <p className="text-xs text-gray-500">{selectedStudent.totalCredentials} total credentials</p>
                      </div>
                    </div>

                    {/* Credentials Summary */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="h-full rounded-lg bg-yellow-50 p-4 text-center">
                        <Star className="mx-auto mb-1 h-6 w-6 text-yellow-500" />
                        <div className="text-2xl font-bold text-yellow-600">{selectedStudent.stickers}</div>
                        <div className="text-xs text-yellow-700">Stickers</div>
                      </div>
                      <div className="h-full rounded-lg bg-blue-50 p-4 text-center">
                        <Medal className="mx-auto mb-1 h-6 w-6 text-blue-500" />
                        <div className="text-2xl font-bold text-blue-600">{selectedStudent.badges}</div>
                        <div className="text-xs text-blue-700">Badges</div>
                      </div>
                      <div className="h-full rounded-lg bg-purple-50 p-4 text-center">
                        <Trophy className="mx-auto mb-1 h-6 w-6 text-purple-500" />
                        <div className="text-2xl font-bold text-purple-600">{selectedStudent.plaques}</div>
                        <div className="text-xs text-purple-700">Plaques</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Credentials */}
                <Card className="rounded-xl border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-900">Recent Credentials</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {selectedStudent.credentials.slice(0, 5).map((credential) => (
                        <div key={credential.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                          {getCredentialIcon(credential.type)}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{credential.title}</h4>
                            <p className="text-xs text-gray-600">{credential.description}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(credential.awardedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {selectedStudent.credentials.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/70 py-8 text-center">
                          <Award className="mx-auto mb-2 h-6 w-6 text-gray-400" />
                          <h4 className="text-sm font-semibold text-gray-900">No credentials yet</h4>
                          <p className="mt-1 text-xs text-gray-600">
                            Credentials will appear here after this student demonstrates mastery.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="mt-0 space-y-3">
                <Card className="rounded-xl border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-900">Assigned Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {selectedStudent.projects.map((project) => (
                        <div key={project.projectId} className="rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{project.projectTitle}</h4>
                            <Badge 
                              variant="default"
                              className={`text-xs ${
                                project.projectStatus === 'active' ? 'bg-green-100 text-green-800' :
                                project.projectStatus === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {project.projectStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{project.projectDescription}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            <span>Teacher: {project.teacherName}</span>
                          </div>
                        </div>
                      ))}
                      {selectedStudent.projects.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/70 py-8 text-center">
                          <FolderOpen className="mx-auto mb-2 h-6 w-6 text-gray-400" />
                          <h4 className="text-sm font-semibold text-gray-900">No projects assigned</h4>
                          <p className="mt-1 text-xs text-gray-600">
                            Projects assigned to this student will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="competencies" className="mt-0">
                {selectedStudent.competencyProgress.length === 0 ? (
                  <Card className="rounded-xl border-gray-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <BarChart3 className="mx-auto mb-2 h-6 w-6 text-gray-400" />
                      <h4 className="text-sm font-semibold text-gray-900">No competency data yet</h4>
                      <p className="mt-1 text-xs text-gray-600">
                        Competency progress will show once this student has graded assessments.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <CompetencyProgress studentId={selectedStudent.id} />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="rounded-xl border-gray-200 shadow-sm">
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">Select a Student</h3>
                  <p className="text-gray-600">Choose a student from the list to view their progress</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
