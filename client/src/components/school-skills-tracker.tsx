import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  Users,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { api } from '@/lib/api';

interface ComponentSkillProgress {
  id: number;
  name: string;
  competencyId: number;
  competencyName: string;
  learnerOutcomeName: string;
  averageScore: number;
  studentsAssessed: number;
  totalStudents: number;
  passRate: number; // Percentage of students who achieved proficient or above
  strugglingStudents: number; // Number of students scoring below developing
  excellingStudents: number; // Number of students scoring applying level
  rubricDistribution: {
    emerging: number;
    developing: number;
    proficient: number;
    applying: number;
  };
  trend: 'improving' | 'declining' | 'stable';
  lastAssessmentDate: string;
}

interface SchoolSkillsStats {
  totalSkillsAssessed: number;
  averageSchoolScore: number;
  skillsNeedingAttention: number;
  excellentPerformance: number;
  studentsAssessed: number;
  totalStudents: number;
}

interface LearnerOutcomeOption {
  id: number;
  name: string;
}

export default function SchoolSkillsTracker() {
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'performance' | 'struggling' | 'assessed'>('struggling');
  const [viewMode, setViewMode] = useState<'overview' | 'details'>('overview');

  const { data: apiSkillsData = [], isLoading, error } = useQuery<ComponentSkillProgress[]>({
    queryKey: ["/api/teacher/school-component-skills-progress"],
    retry: false,
  });

  // Use actual API data only - no mock data fallback
  const skillsData = apiSkillsData;

  const { data: learnerOutcomes = [] } = useQuery<LearnerOutcomeOption[]>({
    queryKey: ["/api/learner-outcomes-hierarchy/complete"],
    queryFn: api.getLearnerOutcomesHierarchyComplete,
    retry: false,
  });

  const { data: apiSchoolStats = {
    totalSkillsAssessed: 0,
    averageSchoolScore: 0,
    skillsNeedingAttention: 0,
    excellentPerformance: 0,
    studentsAssessed: 0,
    totalStudents: 0
  } } = useQuery<SchoolSkillsStats>({
    queryKey: ["/api/teacher/school-skills-stats"],
    retry: false,
  });

  // Mock school stats if API fails

  const schoolStats = apiSchoolStats

  const handleSortByChange = (value: string) => {
    if (value === 'performance' || value === 'struggling' || value === 'assessed') {
      setSortBy(value);
    }
  };

  const handleViewModeChange = (value: string) => {
    if (value === 'overview' || value === 'details') {
      setViewMode(value);
    }
  };

  // Filter and sort skills data
  const filteredSkills = skillsData.filter(skill => 
    selectedOutcome === 'all' || skill.learnerOutcomeName === selectedOutcome
  );

  const sortedSkills = [...filteredSkills].sort((a, b) => {
    switch (sortBy) {
      case 'performance':
        return a.averageScore - b.averageScore;
      case 'struggling':
        return b.strugglingStudents - a.strugglingStudents;
      case 'assessed':
        return b.studentsAssessed - a.studentsAssessed;
      default:
        return 0;
    }
  });

  const getPerformanceColor = (score: number) => {
    if (score >= 3.5) return 'bg-green-500';
    if (score >= 2.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 3.5) return 'Applying';
    if (score >= 2.5) return 'Proficient';
    if (score >= 1.5) return 'Developing';
    return 'Emerging';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRiskLevel = (skill: ComponentSkillProgress) => {
    const strugglingPercentage = (skill.strugglingStudents / skill.studentsAssessed) * 100;
    if (strugglingPercentage > 40) return 'high';
    if (strugglingPercentage > 25) return 'medium';
    return 'low';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Component Skills Data</h3>
          <p className="text-gray-600 mb-4">
            There was an error loading the component skills progress data. This might be due to:
          </p>
          <ul className="text-sm text-gray-500 mb-6 space-y-1">
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
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Component Skills Assessed Yet</h3>
          <p className="text-gray-600 mb-4">
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
      {/* Header */}
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

      {/* School-wide Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Skills Assessed</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.totalSkillsAssessed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.averageSchoolScore.toFixed(1)}</p>
                <p className="text-xs text-gray-500">{getPerformanceLevel(schoolStats.averageSchoolScore)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Need Attention</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.skillsNeedingAttention}</p>
                <p className="text-xs text-gray-500">Skills struggling</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Excelling</p>
                <p className="text-2xl font-bold text-gray-900">{schoolStats.excellentPerformance}</p>
                <p className="text-xs text-gray-500">High performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Learner Outcome</label>
          <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
            <SelectTrigger>
              <SelectValue placeholder="Select learner outcome..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              {learnerOutcomes.map((outcome) => (
                <SelectItem key={outcome.id} value={outcome.name}>
                  {outcome.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
          <Select value={sortBy} onValueChange={handleSortByChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="struggling">Most Struggling</SelectItem>
              <SelectItem value="performance">Lowest Performance</SelectItem>
              <SelectItem value="assessed">Most Assessed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Skills Performance List */}
      <Tabs value={viewMode} onValueChange={handleViewModeChange}>
        <TabsContent value="overview">
          <div className="grid gap-4">
            {sortedSkills.map((skill) => {
              const riskLevel = getRiskLevel(skill);
              return (
                <Card key={skill.id} className={`border-l-4 ${
                  riskLevel === 'high' ? 'border-l-red-500' :
                  riskLevel === 'medium' ? 'border-l-yellow-500' :
                  'border-l-green-500'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{skill.name}</h3>
                          {getTrendIcon(skill.trend)}
                          <Badge variant={
                            riskLevel === 'high' ? 'destructive' :
                            riskLevel === 'medium' ? 'secondary' :
                            'default'
                          }>
                            {riskLevel === 'high' ? 'High Risk' :
                             riskLevel === 'medium' ? 'Medium Risk' :
                             'Low Risk'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{skill.competencyName}</p>
                        <p className="text-xs text-gray-500">{skill.learnerOutcomeName}</p>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{skill.averageScore.toFixed(1)}</p>
                          <p className="text-xs text-gray-500">Avg Score</p>
                        </div>

                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{skill.strugglingStudents}</p>
                          <p className="text-xs text-gray-500">Struggling</p>
                        </div>

                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{skill.excellingStudents}</p>
                          <p className="text-xs text-gray-500">Excelling</p>
                        </div>

                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-900">{skill.studentsAssessed}/{skill.totalStudents}</p>
                          <p className="text-xs text-gray-500">Assessed</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Performance Distribution</span>
                        <span className="text-sm text-gray-500">{skill.passRate.toFixed(0)}% passing</span>
                      </div>
                      <div className="flex h-6 bg-gray-200 rounded overflow-hidden">
                        {skill.rubricDistribution.emerging > 0 && (
                          <div 
                            className="bg-red-500 h-full flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${(skill.rubricDistribution.emerging / skill.studentsAssessed) * 100}%` }}
                            title={`Emerging: ${skill.rubricDistribution.emerging} students (${((skill.rubricDistribution.emerging / skill.studentsAssessed) * 100).toFixed(0)}%)`}
                            data-testid={`distribution-emerging-${skill.id}`}
                          >
                            {(skill.rubricDistribution.emerging / skill.studentsAssessed) * 100 >= 10 ? skill.rubricDistribution.emerging : ''}
                          </div>
                        )}
                        {skill.rubricDistribution.developing > 0 && (
                          <div 
                            className="bg-yellow-500 h-full flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${(skill.rubricDistribution.developing / skill.studentsAssessed) * 100}%` }}
                            title={`Developing: ${skill.rubricDistribution.developing} students (${((skill.rubricDistribution.developing / skill.studentsAssessed) * 100).toFixed(0)}%)`}
                            data-testid={`distribution-developing-${skill.id}`}
                          >
                            {(skill.rubricDistribution.developing / skill.studentsAssessed) * 100 >= 10 ? skill.rubricDistribution.developing : ''}
                          </div>
                        )}
                        {skill.rubricDistribution.proficient > 0 && (
                          <div 
                            className="bg-blue-500 h-full flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${(skill.rubricDistribution.proficient / skill.studentsAssessed) * 100}%` }}
                            title={`Proficient: ${skill.rubricDistribution.proficient} students (${((skill.rubricDistribution.proficient / skill.studentsAssessed) * 100).toFixed(0)}%)`}
                            data-testid={`distribution-proficient-${skill.id}`}
                          >
                            {(skill.rubricDistribution.proficient / skill.studentsAssessed) * 100 >= 10 ? skill.rubricDistribution.proficient : ''}
                          </div>
                        )}
                        {skill.rubricDistribution.applying > 0 && (
                          <div 
                            className="bg-green-500 h-full flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${(skill.rubricDistribution.applying / skill.studentsAssessed) * 100}%` }}
                            title={`Applying: ${skill.rubricDistribution.applying} students (${((skill.rubricDistribution.applying / skill.studentsAssessed) * 100).toFixed(0)}%)`}
                            data-testid={`distribution-applying-${skill.id}`}
                          >
                            {(skill.rubricDistribution.applying / skill.studentsAssessed) * 100 >= 10 ? skill.rubricDistribution.applying : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                          <span className="text-xs text-gray-600">Emerging: {skill.rubricDistribution.emerging} ({((skill.rubricDistribution.emerging / skill.studentsAssessed) * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
                          <span className="text-xs text-gray-600">Developing: {skill.rubricDistribution.developing} ({((skill.rubricDistribution.developing / skill.studentsAssessed) * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                          <span className="text-xs text-gray-600">Proficient: {skill.rubricDistribution.proficient} ({((skill.rubricDistribution.proficient / skill.studentsAssessed) * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                          <span className="text-xs text-gray-600">Applying: {skill.rubricDistribution.applying} ({((skill.rubricDistribution.applying / skill.studentsAssessed) * 100).toFixed(0)}%)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
                      <th className="text-left p-3">Component Skill</th>
                      <th className="text-left p-3">Competency</th>
                      <th className="text-center p-3">Avg Score</th>
                      <th className="text-center p-3">Emerging</th>
                      <th className="text-center p-3">Developing</th>
                      <th className="text-center p-3">Proficient</th>
                      <th className="text-center p-3">Applying</th>
                      <th className="text-center p-3">Pass Rate</th>
                      <th className="text-center p-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSkills.map((skill) => (
                      <tr key={skill.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{skill.name}</p>
                            <p className="text-xs text-gray-500">{skill.learnerOutcomeName}</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{skill.competencyName}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block w-8 h-8 rounded text-white text-xs flex items-center justify-center ${getPerformanceColor(skill.averageScore)}`}>
                            {skill.averageScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-3 text-center">{skill.rubricDistribution.emerging}</td>
                        <td className="p-3 text-center">{skill.rubricDistribution.developing}</td>
                        <td className="p-3 text-center">{skill.rubricDistribution.proficient}</td>
                        <td className="p-3 text-center">{skill.rubricDistribution.applying}</td>
                        <td className="p-3 text-center">{skill.passRate.toFixed(0)}%</td>
                        <td className="p-3 text-center">{getTrendIcon(skill.trend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Items */}
      {schoolStats.skillsNeedingAttention > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Recommended Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800">
                  {schoolStats.skillsNeedingAttention} component skills need immediate attention
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Consider creating targeted interventions for struggling students in these areas
                </p>
              </div>
              {/* Add more action items based on data patterns */}
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  Generate Intervention Plan
                </Button>
                <Button size="sm" variant="outline">
                  Create Support Materials
                </Button>
                <Button size="sm" variant="outline">
                  Schedule Professional Development
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
