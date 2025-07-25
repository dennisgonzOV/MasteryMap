import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherProjects from "@/pages/teacher/projects";
import TeacherAssessments from "@/pages/teacher/assessments";
import AssessmentDetails from "@/pages/teacher/assessment-details";
import AssessmentSubmissions from "./pages/teacher/assessment-submissions";
import SubmissionReview from "./pages/teacher/submission-review";
import BulkGrading from "./pages/teacher/bulk-grading";
import StudentDashboard from "@/pages/student/dashboard";
import StudentProjects from "@/pages/student/projects";
import StudentProjectDetail from "@/pages/student/project-detail";
import StudentMilestoneDetail from "@/pages/student/milestone-detail";
import StudentPortfolio from "@/pages/student/portfolio";
import TakeAssessment from "@/pages/student/take-assessment";
import AdminDashboard from "@/pages/admin/dashboard";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Public assessment route - accessible after login */}
      <Route path="/assessment/:id" component={TakeAssessment} />

      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          {user?.role === 'teacher' && (
            <>
              <Route path="/teacher/dashboard" component={TeacherDashboard} />
              <Route path="/teacher/projects" component={TeacherProjects} />
              <Route path="/teacher/assessments" component={TeacherAssessments} />
              <Route path="/teacher/assessments/:id/submissions/:submissionId" component={SubmissionReview} />
              <Route path="/teacher/assessments/:id/submissions" component={AssessmentSubmissions} />
              <Route path="/teacher/assessments/:id/grade" component={BulkGrading} />
              <Route path="/teacher/assessments/:id" component={AssessmentDetails} />
            </>
          )}
          {user?.role === 'student' && (
            <>
              <Route path="/student/dashboard" component={StudentDashboard} />
              <Route path="/student/projects" component={StudentProjects} />
              <Route path="/student/projects/:id" component={StudentProjectDetail} />
              <Route path="/student/milestones/:id" component={StudentMilestoneDetail} />
              <Route path="/student/assessments/:id" component={TakeAssessment} />
              <Route path="/student/portfolio" component={StudentPortfolio} />
            </>
          )}
          {user?.role === 'admin' && (
            <Route path="/admin/dashboard" component={AdminDashboard} />
          )}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;