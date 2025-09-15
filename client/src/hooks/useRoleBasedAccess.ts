import React, { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useLocation } from 'wouter';

/**
 * Role-based access control hook to eliminate duplication across components
 */

// Import the enum from shared schema
import { UserRole } from '../../../shared/schema';

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

  const userRole = (user as any)?.role as UserRole;
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
    isAdmin: userRole === UserRole.ADMIN,
    isTeacher: userRole === UserRole.TEACHER,
    isStudent: userRole === UserRole.STUDENT,
    canAccess: isAuthorized,
  };
}

/**
 * Hook for admin-only access
 */
export function useAdminAccess(options?: Omit<RoleBasedAccessOptions, 'allowedRoles'>) {
  return useRoleBasedAccess({
    ...options,
    allowedRoles: [UserRole.ADMIN]
  });
}

/**
 * Hook for teacher and admin access
 */
export function useTeacherAccess(options?: Omit<RoleBasedAccessOptions, 'allowedRoles'>) {
  return useRoleBasedAccess({
    ...options,
    allowedRoles: [UserRole.TEACHER, UserRole.ADMIN]
  });
}

/**
 * Hook for student access (with optional teacher/admin access)
 */
export function useStudentAccess(includeTeachers = false, options?: Omit<RoleBasedAccessOptions, 'allowedRoles'>) {
  const allowedRoles: UserRole[] = [UserRole.STUDENT];
  if (includeTeachers) {
    allowedRoles.push(UserRole.TEACHER, UserRole.ADMIN);
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
  const { user, isAuthenticated } = useAuth();
  const userRole = (user as any)?.role as UserRole;
  
  return {
    renderForRole: (role: UserRole, component: React.ReactNode) => {
      return userRole === role ? component : null;
    },
    
    renderForRoles: (roles: UserRole[], component: React.ReactNode) => {
      return roles.includes(userRole) ? component : null;
    },
    
    renderForAdmin: (component: React.ReactNode) => {
      return userRole === UserRole.ADMIN ? component : null;
    },
    
    renderForTeacher: (component: React.ReactNode) => {
      return userRole === UserRole.TEACHER ? component : null;
    },
    
    renderForStudent: (component: React.ReactNode) => {
      return userRole === UserRole.STUDENT ? component : null;
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
    
    const route = getDefaultRedirectForRole((user as any).role as UserRole);
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
    case UserRole.ADMIN:
      return '/admin/dashboard';
    case UserRole.TEACHER:
      return '/teacher/dashboard';
    case UserRole.STUDENT:
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
      return React.createElement('div', null, 'Loading...');
    }
    
    if (!canAccess) {
      return React.createElement('div', null, 'Unauthorized');
    }
    
    return React.createElement(Component, props);
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
  const { user, isAuthenticated } = useAuth();
  const userRole = (user as any)?.role as UserRole;
  
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }
  
  if (roles.length === 0 || roles.includes(userRole)) {
    return React.createElement(React.Fragment, null, children);
  }
  
  return React.createElement(React.Fragment, null, fallback);
}

/**
 * Permission checking utilities
 */
export const permissions = {
  canCreateProject: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
  canDeleteProject: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
  canGradeSubmission: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
  canViewAllStudents: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
  canManageUsers: (userRole: UserRole) => userRole === UserRole.ADMIN,
  canAccessAnalytics: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
  canModerateContent: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
  canExportData: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
  canManageCredentials: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
  canViewTeacherTools: (userRole: UserRole) => [UserRole.TEACHER, UserRole.ADMIN].includes(userRole),
};

/**
 * Hook for checking specific permissions
 */
export function usePermissions() {
  const { user } = useAuth();
  const userRole = (user as any)?.role as UserRole;
  
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