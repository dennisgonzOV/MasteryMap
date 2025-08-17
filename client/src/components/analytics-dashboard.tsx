import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  BookOpen, 
  FileText, 
  Award, 
  TrendingUp, 
  Calendar,
  Download,
  Activity,
  Target,
  Clock
} from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalAssessments: number;
  gradedAssessments: number;
  totalCredentials: number;
  recentActivity: Array<{
    id: number;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
  userGrowth: Array<{
    month: string;
    teachers: number;
    students: number;
  }>;
  projectStats: Array<{
    project: string;
    completionRate: number;
    studentsAssigned: number;
    averageScore: number;
  }>;
  competencyProgress: Array<{
    competency: string;
    proficientCount: number;
    totalStudents: number;
    percentage: number;
  }>;
}

interface AnalyticsDashboardProps {
  timeRange: '7d' | '30d' | '90d' | '1y';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
}

export default function AnalyticsDashboard({ timeRange, onTimeRangeChange }: AnalyticsDashboardProps) {
  // Mock data for demonstration
  const data: AnalyticsData = {
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalAssessments: 0,
    gradedAssessments: 0,
    totalCredentials: 0,
    recentActivity: [],
    userGrowth: [
      { month: 'Jan', teachers: 12, students: 145 },
      { month: 'Feb', teachers: 15, students: 167 },
      { month: 'Mar', teachers: 18, students: 189 },
      { month: 'Apr', teachers: 22, students: 223 },
      { month: 'May', teachers: 25, students: 245 },
      { month: 'Jun', teachers: 28, students: 289 }
    ],
    projectStats: [
      { project: 'Digital Portfolio', completionRate: 87, studentsAssigned: 145, averageScore: 78 },
      { project: 'Web Development', completionRate: 92, studentsAssigned: 89, averageScore: 85 },
      { project: 'Creative Writing', completionRate: 76, studentsAssigned: 112, averageScore: 72 },
      { project: 'Data Analysis', completionRate: 68, studentsAssigned: 67, averageScore: 81 }
    ],
    competencyProgress: [
      { competency: 'Critical Thinking', proficientCount: 156, totalStudents: 245, percentage: 64 },
      { competency: 'Communication', proficientCount: 189, totalStudents: 245, percentage: 77 },
      { competency: 'Collaboration', proficientCount: 134, totalStudents: 245, percentage: 55 },
      { competency: 'Creativity', proficientCount: 167, totalStudents: 245, percentage: 68 }
    ]
  };

  const exportData = () => {
    // In a real app, this would generate and download CSV
    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', data?.totalUsers || 0],
      ['Active Users', data?.activeUsers || 0],
      ['Total Projects', data?.totalProjects || 0],
      ['Active Projects', data?.activeProjects || 0],
      ['Total Assessments', data?.totalAssessments || 0],
      ['Graded Assessments', data?.gradedAssessments || 0],
      ['Total Credentials', data?.totalCredentials || 0]
    ];
    

    alert('CSV export functionality would be implemented here');
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">System-wide metrics and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalUsers}</p>
                <p className="text-xs text-green-600">↑ {data.activeUsers} active</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projects</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalProjects}</p>
                <p className="text-xs text-green-600">↑ {data.activeProjects} active</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assessments</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalAssessments}</p>
                <p className="text-xs text-blue-600">↑ {data.gradedAssessments} graded</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Credentials</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalCredentials}</p>
                <p className="text-xs text-yellow-600">↑ Badges & Stickers</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Project Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.projectStats.map((project, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{project.project}</span>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{project.studentsAssigned} students</span>
                      <span>Avg: {project.averageScore}%</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={project.completionRate} className="flex-1" />
                    <span className="text-sm font-medium">{project.completionRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competency Progress & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Competency Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.competencyProgress.map((competency, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{competency.competency}</span>
                    <span className="text-gray-600">
                      {competency.proficientCount}/{competency.totalStudents} students
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={competency.percentage} className="flex-1" />
                    <span className="text-sm font-medium">{competency.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <span>{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}