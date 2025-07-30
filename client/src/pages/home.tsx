import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Redirect to role-specific dashboard
        switch (user.role) {
          case 'teacher':
            setLocation('/teacher/dashboard');
            break;
          case 'student':
            setLocation('/student/dashboard');
            break;
          case 'admin':
            setLocation('/admin/dashboard');
            break;
          default:
            setLocation('/student/dashboard');
        }
      } else if (!isAuthenticated) {
        // User is not authenticated, don't redirect - let App.tsx routing handle it
        return;
      }
    }
  }, [user, isLoading, isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="flex items-center space-x-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-lg text-gray-700">
          {isLoading ? 'Loading...' : 'Redirecting...'}
        </span>
      </div>
    </div>
  );
}
