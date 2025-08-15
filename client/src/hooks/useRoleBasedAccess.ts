import { useAuth } from './useAuth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

/**
 * Role-based access control hook to eliminate duplication across components
 */

export type UserRole = 'admin' | 'teacher' | 'student';

export interface RoleBasedAccessOptions {
  allowedRoles?: UserRole[];
  redirectTo?: string;
  requireAuth?: boolean;
  onUnauthorized?: () => void;
}

export function useRoleBasedAccess(options: RoleBasedAccessOptions = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const {
    allowedRoles = [],
    redirectTo = '/login',
    requireAuth = true,
    onUnauthorized
  } = options;

  const userRole = user?.role as UserRole;
  const isAuthorized = !requireAuth || (isAuthenticated && (!allowedRoles.length || allowedRoles.includes(userRole)));

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      setLocation(redirectTo);
      return;
    }

    if (!isLoading && isAuthenticated && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        setLocation(getDefaultRedirectForRole(userRole));
      }
    }
  }, [isLoading, isAuthenticated, userRole, allowedRoles, redirectTo, onUnauthorized, setLocation]);

  return {
    user,
    userRole,
    isAuthenticated,
    isAuthorized,
    isLoading,
    hasRole: (role: UserRole) => userRole === role,
    hasAnyRole: (roles: UserRole[]) => roles.includes(userRole),
    isAdmin: userRole === 'admin',
    isTeacher: userRole === 'teacher',
    isStudent: userRole === 'student',
    canAccess: isAuthorized,
  };
}

/**
 * Hook for admin-only access
 */
export function useAdminAccess(options?: Omit<RoleBasedAccessOptions, 'allowedRoles'>) {
  return useRoleBasedAccess({
    ...options,
    allowedRoles: ['admin']
  });
}

/**
 * Hook for teacher and admin access
 */
export function useTeacherAccess(options?: Omit<RoleBasedAccessOptions, 'allowedRoles'>) {
  return useRoleBasedAccess({
    ...options,
    allowedRoles: ['teacher', 'admin']
  });
}

/**
 * Hook for student access (with optional teacher/admin access)
 */
export function useStudentAccess(includeTeachers = false, options?: Omit<RoleBasedAccessOptions, 'allowedRoles'>) {
  const allowedRoles: UserRole[] = ['student'];
  if (includeTeachers) {
    allowedRoles.push('teacher', 'admin');
  }
  
  return useRoleBasedAccess({
    ...options,
    allowedRoles
  });
}

/**
 * Hook for conditional rendering based on roles
 */
export function useConditionalRender() {
  const { userRole, isAuthenticated } = useAuth();
  
  return {
    renderForRole: (role: UserRole, component: React.ReactNode) => {
      return userRole === role ? component : null;
    },
    
    renderForRoles: (roles: UserRole[], component: React.ReactNode) => {
      return roles.includes(userRole) ? component : null;
    },
    
    renderForAdmin: (component: React.ReactNode) => {
      return userRole === 'admin' ? component : null;
    },
    
    renderForTeacher: (component: React.ReactNode) => {
      return userRole === 'teacher' ? component : null;
    },
    
    renderForStudent: (component: React.ReactNode) => {
      return userRole === 'student' ? component : null;
    },
    
    renderForAuthenticated: (component: React.ReactNode) => {
      return isAuthenticated ? component : null;
    },
    
    renderForUnauthenticated: (component: React.ReactNode) => {
      return !isAuthenticated ? component : null;
    }
  };
}

/**
 * Role-based redirect hook
 */
export function useRoleBasedRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const redirectToRoleDashboard = () => {
    if (!isAuthenticated || !user) return;
    
    const route = getDefaultRedirectForRole(user.role as UserRole);
    setLocation(route);
  };

  const redirectToLogin = () => {
    setLocation('/login');
  };

  const redirectToHome = () => {
    setLocation('/');
  };

  return {
    redirectToRoleDashboard,
    redirectToLogin,
    redirectToHome,
    isLoading
  };
}

/**
 * Get default redirect route for a user role
 */
export function getDefaultRedirectForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'teacher':
      return '/teacher/dashboard';
    case 'student':
      return '/student/dashboard';
    default:
      return '/';
  }
}

/**
 * Higher-order component for role-based route protection
 */
export function withRoleBasedAccess<P extends object>(
  Component: React.ComponentType<P>,
  options: RoleBasedAccessOptions = {}
) {
  return function ProtectedComponent(props: P) {
    const { canAccess, isLoading } = useRoleBasedAccess(options);
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!canAccess) {
      return <div>Unauthorized</div>;
    }
    
    return <Component {...props} />;
  };
}

/**
 * Component for role-based conditional rendering
 */
interface RoleGateProps {
  roles?: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function RoleGate({ 
  roles = [], 
  fallback = null, 
  children, 
  requireAuth = true 
}: RoleGateProps) {
  const { userRole, isAuthenticated } = useAuth();
  
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }
  
  if (roles.length === 0 || roles.includes(userRole)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Permission checking utilities
 */
export const permissions = {
  canCreateProject: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
  canDeleteProject: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
  canGradeSubmission: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
  canViewAllStudents: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
  canManageUsers: (userRole: UserRole) => userRole === 'admin',
  canAccessAnalytics: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
  canModerateContent: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
  canExportData: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
  canManageCredentials: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
  canViewTeacherTools: (userRole: UserRole) => ['teacher', 'admin'].includes(userRole),
};

/**
 * Hook for checking specific permissions
 */
export function usePermissions() {
  const { userRole } = useAuth();
  
  return {
    ...permissions,
    checkPermission: (permission: keyof typeof permissions) => {
      return permissions[permission](userRole);
    },
    hasPermission: (permission: keyof typeof permissions) => {
      return permissions[permission](userRole);
    }
  };
}