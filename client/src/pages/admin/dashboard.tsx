import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  Target,
  Award,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { AdminAnalyticsDashboardDTO } from "@shared/contracts/api";

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery<AdminAnalyticsDashboardDTO>({
    queryKey: ["/api/admin/analytics/dashboard"],
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      window.location.href = `/${user.role}/dashboard`;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  useEffect(() => {
    if (!analyticsError) {
      return;
    }

    const message =
      analyticsError instanceof Error
        ? analyticsError.message
        : "Failed to load dashboard analytics";

    if (analyticsError instanceof Error && isUnauthorizedError(analyticsError)) {
      toast({
        title: "Session Expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Dashboard Error",
      description: message,
      variant: "destructive",
    });
  }, [analyticsError, toast]);

  if (isLoading || (isAuthenticated && user?.role === "admin" && analyticsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const data: AdminAnalyticsDashboardDTO = analytics ?? {
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalAssessments: 0,
    gradedAssessments: 0,
    totalCredentials: 0,
    roleDistribution: { students: 0, teachers: 0, admins: 0 },
    gradeDistribution: [],
    userGrowth: [],
    weeklyActivity: [],
    projectStatusDistribution: [],
    needsAttention: {
      overdueProjects: 0,
      ungradedSubmissions: 0,
      draftProjects: 0,
    },
    recentActivity: [],
  };

  const assessmentCompletionRate =
    data.totalAssessments > 0
      ? Math.round((data.gradedAssessments / data.totalAssessments) * 100)
      : 0;

  const userDistribution = [
    { name: "Students", value: data.roleDistribution.students, color: "#3B82F6" },
    { name: "Teachers", value: data.roleDistribution.teachers, color: "#10B981" },
    { name: "Admins", value: data.roleDistribution.admins, color: "#F59E0B" },
  ];

  const getSeverityIcon = (severity: "info" | "success") => {
    if (severity === "success") {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <Activity className="h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Dashboard</h1>
            <p className="text-gray-600">
              Live system metrics across users, projects, assessments, and credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totalUsers.toLocaleString()}</p>
                    <p className="text-xs text-blue-600">{data.activeUsers.toLocaleString()} active (30d)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{data.activeProjects.toLocaleString()}</p>
                    <p className="text-xs text-green-600">{data.totalProjects.toLocaleString()} total projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Assessments</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totalAssessments.toLocaleString()}</p>
                    <p className="text-xs text-blue-600">{assessmentCompletionRate}% fully graded</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Award className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Credentials</p>
                    <p className="text-2xl font-bold text-gray-900">{data.totalCredentials.toLocaleString()}</p>
                    <p className="text-xs text-orange-600">Total awards issued</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="apple-shadow border-0">
              <CardHeader>
                <CardTitle>User & Project Growth (6 months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="projects" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={84}
                      dataKey="value"
                    >
                      {userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <Card className="apple-shadow border-0">
                <CardHeader>
                  <CardTitle>Weekly Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.weeklyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="users" fill="#3B82F6" name="Users Created" />
                      <Bar dataKey="submissions" fill="#10B981" name="Submissions" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="apple-shadow border-0">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recentActivity.length === 0 ? (
                    <p className="text-sm text-gray-500">No recent activity yet.</p>
                  ) : (
                    data.recentActivity.map((activityItem) => (
                      <div
                        key={activityItem.id}
                        className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {getSeverityIcon(activityItem.severity)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activityItem.message}</p>
                          <p className="text-xs text-gray-600">{formatRelativeTime(activityItem.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="apple-shadow border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Needs Attention</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Ungraded submissions</span>
                    <Badge className="bg-orange-100 text-orange-800">{data.needsAttention.ungradedSubmissions}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Overdue projects</span>
                    <Badge className="bg-red-100 text-red-800">{data.needsAttention.overdueProjects}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Draft projects</span>
                    <Badge className="bg-yellow-100 text-yellow-800">{data.needsAttention.draftProjects}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Project Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.projectStatusDistribution.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{item.status}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span>Student Grades</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.gradeDistribution.length === 0 ? (
                    <p className="text-sm text-gray-500">No student grade assignments yet.</p>
                  ) : (
                    data.gradeDistribution.map((item) => (
                      <div key={item.grade} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {item.grade === "K" ? "Kindergarten" : `Grade ${item.grade}`}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
