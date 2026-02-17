import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { LearnerOutcomeHierarchyItemDTO } from '@shared/contracts/api';

interface ComponentSkillProgress {
  id: number;
  name: string;
  competencyId: number;
  competencyName: string;
  learnerOutcomeName: string;
  averageScore: number;
  studentsAssessed: number;
  totalStudents: number;
  passRate: number;
  strugglingStudents: number;
  excellingStudents: number;
  rubricDistribution: {
    emerging: number;
    developing: number;
    proficient: number;
    applying: number;
  };
}

interface SchoolSkillsStats {
  totalSkillsAssessed: number;
  averageSchoolScore: number;
  skillsNeedingAttention: number;
  excellentPerformance: number;
  studentsAssessed: number;
  totalStudents: number;
}

type SortOption = 'assessed' | 'lowestPerformance' | 'highestPerformance';

const ALL_FILTER_OPTION = 'all';
const UNASSIGNED_GRADE_OPTION = '__unassigned__';

function normalizeGradeValue(rawGrade: string | null | undefined): string {
  const grade = (rawGrade ?? '').trim();
  if (!grade) {
    return UNASSIGNED_GRADE_OPTION;
  }

  const lower = grade.toLowerCase();
  if (lower === 'k' || lower.includes('kindergarten')) {
    return 'K';
  }

  const numericMatch = lower.match(/\b([0-9]{1,2})(?:st|nd|rd|th)?\b/);
  if (numericMatch) {
    return String(Number.parseInt(numericMatch[1], 10));
  }

  return grade;
}

function formatGradeLabel(gradeValue: string): string {
  if (gradeValue === UNASSIGNED_GRADE_OPTION) {
    return 'Unassigned';
  }
  if (gradeValue === 'K') {
    return 'Kindergarten';
  }
  return `Grade ${gradeValue}`;
}

function compareGradeValues(a: string, b: string): number {
  if (a === UNASSIGNED_GRADE_OPTION) return 1;
  if (b === UNASSIGNED_GRADE_OPTION) return -1;
  if (a === 'K') return -1;
  if (b === 'K') return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function SchoolSkillsTracker() {
  const [selectedOutcome, setSelectedOutcome] = useState<string>(ALL_FILTER_OPTION);
  const [selectedGrade, setSelectedGrade] = useState<string>(ALL_FILTER_OPTION);
  const [sortBy, setSortBy] = useState<SortOption>('assessed');
  const [viewMode, setViewMode] = useState<'overview' | 'details'>('overview');

  const gradeQuery = selectedGrade === ALL_FILTER_OPTION
    ? ''
    : `?grade=${encodeURIComponent(selectedGrade)}`;

  const skillsProgressPath = `/api/assessments/teacher/school-component-skills-progress${gradeQuery}`;
  const schoolStatsPath = `/api/assessments/teacher/school-skills-stats${gradeQuery}`;

  const { data: skillsData = [], isLoading, error } = useQuery<ComponentSkillProgress[]>({
    queryKey: [skillsProgressPath],
    retry: false,
  });

  const { data: learnerOutcomeHierarchy = [] } = useQuery<LearnerOutcomeHierarchyItemDTO[]>({
    queryKey: ["/api/competencies/learner-outcomes-hierarchy/complete"],
    queryFn: api.getLearnerOutcomesHierarchyComplete,
    retry: false,
  });

  const { data: schoolStudents = [] } = useQuery<Array<{ grade?: string | null }>>({
    queryKey: ["/api/schools/students-progress"],
    queryFn: api.getSchoolStudentsProgress,
    retry: false,
  });

  const { data: schoolStats = {
    totalSkillsAssessed: 0,
    averageSchoolScore: 0,
    skillsNeedingAttention: 0,
    excellentPerformance: 0,
    studentsAssessed: 0,
    totalStudents: 0,
  } } = useQuery<SchoolSkillsStats>({
    queryKey: [schoolStatsPath],
    retry: false,
  });

  const learnerOutcomeOptions = useMemo(() => {
    const names = new Set<string>();

    learnerOutcomeHierarchy.forEach((outcome) => {
      const name = outcome.name?.trim();
      if (name) {
        names.add(name);
      }
    });

    skillsData.forEach((skill) => {
      const name = skill.learnerOutcomeName?.trim();
      if (name && name.toLowerCase() !== 'unknown learner outcome') {
        names.add(name);
      }
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [learnerOutcomeHierarchy, skillsData]);

  const gradeOptions = useMemo(() => {
    const values = new Set<string>();

    schoolStudents.forEach((student) => {
      values.add(normalizeGradeValue(student.grade));
    });

    return Array.from(values).sort(compareGradeValues);
  }, [schoolStudents]);

  useEffect(() => {
    if (selectedOutcome !== ALL_FILTER_OPTION && !learnerOutcomeOptions.includes(selectedOutcome)) {
      setSelectedOutcome(ALL_FILTER_OPTION);
    }
  }, [learnerOutcomeOptions, selectedOutcome]);

  useEffect(() => {
    if (selectedGrade !== ALL_FILTER_OPTION && !gradeOptions.includes(selectedGrade)) {
      setSelectedGrade(ALL_FILTER_OPTION);
    }
  }, [gradeOptions, selectedGrade]);

  const filteredSkills = skillsData.filter((skill) =>
    selectedOutcome === ALL_FILTER_OPTION || skill.learnerOutcomeName === selectedOutcome,
  );

  const sortedSkills = [...filteredSkills].sort((a, b) => {
    switch (sortBy) {
      case 'lowestPerformance':
        return a.averageScore - b.averageScore;
      case 'highestPerformance':
        return b.averageScore - a.averageScore;
      case 'assessed':
      default:
        return b.studentsAssessed - a.studentsAssessed;
    }
  });

  const getPerformanceColor = (score: number) => {
    if (score >= 3.5) return 'bg-green-600';
    if (score >= 2.5) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 3.5) return 'Applying';
    if (score >= 2.5) return 'Proficient';
    if (score >= 1.5) return 'Developing';
    return 'Emerging';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-1/3 rounded bg-gray-200"></div>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded bg-gray-200"></div>
            ))}
          </div>
          <div className="h-96 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Unable to Load Component Skills Data</h3>
          <p className="mb-4 text-gray-600">
            There was an error loading the component skills progress data. This might be due to:
          </p>
          <ul className="mb-6 space-y-1 text-sm text-gray-500">
            <li>• No component skills have been assessed yet</li>
            <li>• Database connectivity issues</li>
            <li>• Missing component skill data in the system</li>
          </ul>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!skillsData || skillsData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No Component Skills Assessed Yet</h3>
          <p className="mb-4 text-gray-600">
            Once students complete assessments with component skill evaluations, their progress will appear here.
          </p>
          <p className="text-sm text-gray-500">
            Create projects with assessments that include XQ component skills to start tracking progress.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Component Skills Tracker</h2>
          <p className="text-gray-600">Monitor school-wide performance across XQ competency framework</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('overview')}
          >
            Overview
          </Button>
          <Button
            variant={viewMode === 'details' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('details')}
          >
            Details
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-blue-100 p-2">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Skills Assessed</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.totalSkillsAssessed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-green-100 p-2">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.averageSchoolScore.toFixed(1)}</p>
                <p className="text-xs text-gray-600">{getPerformanceLevel(schoolStats.averageSchoolScore)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-red-100 p-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Need Attention</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.skillsNeedingAttention}</p>
                <p className="text-xs text-gray-600">Skills struggling</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="rounded-lg bg-purple-100 p-2">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Excelling</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.excellentPerformance}</p>
                <p className="text-xs text-gray-600">High performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Filter by Learner Outcome</label>
          <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
            <SelectTrigger>
              <SelectValue placeholder="Select learner outcome..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_OPTION}>All Outcomes</SelectItem>
              {learnerOutcomeOptions.map((outcome) => (
                <SelectItem key={outcome} value={outcome}>
                  {outcome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Filter by Grade Level</label>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger>
              <SelectValue placeholder="Select grade..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_OPTION}>All Grades</SelectItem>
              {gradeOptions.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {formatGradeLabel(grade)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Sort by</label>
          <Select
            value={sortBy}
            onValueChange={(value) => {
              if (value === 'assessed' || value === 'lowestPerformance' || value === 'highestPerformance') {
                setSortBy(value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assessed">Most Assessed</SelectItem>
              <SelectItem value="lowestPerformance">Lowest Performance</SelectItem>
              <SelectItem value="highestPerformance">Highest Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => value === 'overview' || value === 'details' ? setViewMode(value) : undefined}>
        <TabsContent value="overview">
          {sortedSkills.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm font-medium text-gray-900">No skills match the current filters.</p>
                <p className="mt-1 text-xs text-gray-600">Try another learner outcome or grade level.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sortedSkills.map((skill) => {
                const totalAssessed = Math.max(skill.studentsAssessed, 1);
                const segments = [
                  { key: 'emerging', label: 'Emerging', short: 'E', colorClass: 'bg-red-500', count: skill.rubricDistribution.emerging },
                  { key: 'developing', label: 'Developing', short: 'D', colorClass: 'bg-yellow-500', count: skill.rubricDistribution.developing },
                  { key: 'proficient', label: 'Proficient', short: 'P', colorClass: 'bg-blue-500', count: skill.rubricDistribution.proficient },
                  { key: 'applying', label: 'Applying', short: 'A', colorClass: 'bg-green-500', count: skill.rubricDistribution.applying },
                ];

                return (
                  <Card key={skill.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">{skill.name}</h3>
                          </div>
                          <p className="mb-1 text-sm text-gray-700">{skill.competencyName}</p>
                          <p className="text-xs font-medium text-gray-600">{skill.learnerOutcomeName}</p>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{skill.averageScore.toFixed(1)}</p>
                            <p className="text-xs text-gray-600">Avg Score</p>
                          </div>

                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-700">{skill.strugglingStudents}</p>
                            <p className="text-xs text-gray-600">Struggling</p>
                          </div>

                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-700">{skill.excellingStudents}</p>
                            <p className="text-xs text-gray-600">Excelling</p>
                          </div>

                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-900">{skill.studentsAssessed}/{skill.totalStudents}</p>
                            <p className="text-xs text-gray-600">Assessed</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">Performance Distribution</span>
                          <span className="text-sm font-semibold text-gray-700">{skill.passRate.toFixed(0)}% passing</span>
                        </div>
                        <div className="flex h-6 overflow-hidden rounded bg-gray-200">
                          {segments.map((segment) => {
                            if (segment.count <= 0) {
                              return null;
                            }

                            const percent = (segment.count / totalAssessed) * 100;
                            return (
                              <div
                                key={segment.key}
                                className={`h-full ${segment.colorClass} flex items-center justify-center text-xs font-medium text-white`}
                                style={{ width: `${percent}%` }}
                                title={`${segment.label}: ${segment.count} students (${percent.toFixed(0)}%)`}
                                aria-label={`${segment.label}: ${segment.count} students (${percent.toFixed(0)} percent)`}
                                data-testid={`distribution-${segment.key}-${skill.id}`}
                              >
                                {percent >= 12 ? `${segment.short}:${segment.count}` : ''}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3">
                          {segments.map((segment) => {
                            const percent = (segment.count / totalAssessed) * 100;
                            return (
                              <div key={segment.key} className="flex items-center gap-1.5">
                                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-sm text-[10px] font-bold text-white ${segment.colorClass}`}>
                                  {segment.short}
                                </span>
                                <span className="text-xs font-medium text-gray-700">
                                  {segment.label}: {segment.count} ({percent.toFixed(0)}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left">Component Skill</th>
                      <th className="p-3 text-left">Competency</th>
                      <th className="p-3 text-center">Avg Score</th>
                      <th className="p-3 text-center">Emerging</th>
                      <th className="p-3 text-center">Developing</th>
                      <th className="p-3 text-center">Proficient</th>
                      <th className="p-3 text-center">Applying</th>
                      <th className="p-3 text-center">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSkills.map((skill) => (
                      <tr key={skill.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900">{skill.name}</p>
                            <p className="text-xs font-medium text-gray-600">{skill.learnerOutcomeName}</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-800">{skill.competencyName}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded text-xs font-semibold text-white ${getPerformanceColor(skill.averageScore)}`}>
                            {skill.averageScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-3 text-center text-gray-800">{skill.rubricDistribution.emerging}</td>
                        <td className="p-3 text-center text-gray-800">{skill.rubricDistribution.developing}</td>
                        <td className="p-3 text-center text-gray-800">{skill.rubricDistribution.proficient}</td>
                        <td className="p-3 text-center text-gray-800">{skill.rubricDistribution.applying}</td>
                        <td className="p-3 text-center text-gray-800">{skill.passRate.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
