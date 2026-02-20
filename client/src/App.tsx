import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Home = lazy(() => import("@/pages/home"));
const TeacherDashboard = lazy(() => import("@/pages/teacher/dashboard"));
const TeacherProjects = lazy(() => import("@/pages/teacher/projects"));
const TeacherAssessments = lazy(() => import("@/pages/teacher/assessments"));
const AssessmentDetails = lazy(() => import("@/pages/teacher/assessment-details"));
const AssessmentSubmissions = lazy(() => import("./pages/teacher/assessment-submissions"));
const SubmissionReview = lazy(() => import("./pages/teacher/submission-review"));
const StudentDashboard = lazy(() => import("@/pages/student/dashboard"));
const StudentProjects = lazy(() => import("@/pages/student/projects"));
const StudentProjectDetail = lazy(() => import("@/pages/student/project-detail"));
const StudentMilestoneDetail = lazy(() => import("@/pages/student/milestone-detail"));
const StudentPortfolio = lazy(() => import("@/pages/student/portfolio"));
const TakeAssessment = lazy(() => import("@/pages/student/take-assessment"));
const EnterCode = lazy(() => import("@/pages/student/enter-code"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const PublicPortfolio = lazy(() => import("@/pages/public-portfolio"));
const ProjectExplorer = lazy(() => import("@/pages/project-explorer"));
const PublicProjectDetail = lazy(() => import("@/pages/public-project-detail"));

function PageLoading({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="flex items-center space-x-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-lg text-gray-700">{message}</span>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <PageLoading message="Loading..." />;
  }

  return (
    <Suspense fallback={<PageLoading message="Loading page..." />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        {/* Public pages - accessible without authentication */}
        <Route path="/portfolio/public/:publicUrl" component={PublicPortfolio} />
        <Route path="/explore" component={ProjectExplorer} />
        <Route path="/explore/project/:id" component={PublicProjectDetail} />

        {!isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
            {(user as any)?.role === 'teacher' && (
              <>
                {(user as any)?.tier !== 'free' && (
                  <>
                    <Route path="/teacher/dashboard" component={TeacherDashboard} />
                    <Route path="/teacher/assessments" component={TeacherAssessments} />
                    <Route path="/teacher/assessments/:id/submissions/:submissionId" component={SubmissionReview} />
                    <Route path="/teacher/assessments/:id/submissions" component={AssessmentSubmissions} />
                    <Route path="/teacher/assessments/:id" component={AssessmentDetails} />
                  </>
                )}
                <Route path="/teacher/projects" component={TeacherProjects} />
              </>
            )}
            {(user as any)?.role === 'student' && (
              <>
                <Route path="/student/dashboard" component={StudentDashboard} />
                <Route path="/student/projects" component={StudentProjects} />
                <Route path="/student/projects/:id" component={StudentProjectDetail} />
                <Route path="/student/milestones/:id" component={StudentMilestoneDetail} />
                <Route path="/student/assessments/:id" component={TakeAssessment} />
                <Route path="/student/enter-code" component={EnterCode} />
                <Route path="/student/portfolio" component={StudentPortfolio} />
              </>
            )}
            {(user as any)?.role === 'admin' && (
              <>
                <Route path="/admin/dashboard" component={AdminDashboard} />
                <Route path="/admin/users" component={AdminUsers} />
              </>
            )}
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary context="Application Root">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary context="Router">
            <Router />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
