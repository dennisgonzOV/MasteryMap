import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../auth';
import { projectsStorage } from '../domains/projects/projects.storage';
import { assessmentStorage } from '../domains/assessments/assessments.storage';
import { handleEntityNotFound, handleAuthorizationError, handleRouteError } from '../utils/routeHelpers';

/**
 * Generic resource access middleware to eliminate duplicated ownership checks
 */
export interface ResourceAccessOptions {
  resourceType: 'project' | 'milestone' | 'assessment' | 'submission';
  paramName?: string;
  checkOwnership?: boolean;
  allowedRoles?: string[];
  customAccessCheck?: (user: any, resource: any) => boolean;
}

/**
 * Middleware to check if user can access a specific resource
 */
export function checkResourceAccess(options: ResourceAccessOptions) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        resourceType,
        paramName = 'id',
        checkOwnership = true,
        allowedRoles = ['teacher', 'admin'],
        customAccessCheck
      } = options;

      const user = req.user;
      if (!user) {
        return handleAuthorizationError(res, "User not authenticated");
      }

      // Check basic role access
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return handleAuthorizationError(res, "Insufficient role permissions");
      }

      const resourceId = parseInt(req.params[paramName]);
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: `Invalid ${paramName}` });
      }

      // Get the resource based on type
      let resource: any;
      try {
        switch (resourceType) {
          case 'project':
            resource = await projectsStorage.getProject(resourceId);
            break;
          case 'milestone':
            resource = await projectsStorage.getMilestone(resourceId);
            break;
          case 'assessment':
            resource = await assessmentStorage.getAssessment(resourceId);
            break;
          case 'submission':
            resource = await assessmentStorage.getSubmission(resourceId);
            break;
          default:
            return res.status(400).json({ message: 'Invalid resource type' });
        }
      } catch (error) {
        return handleRouteError(res, error, `fetch ${resourceType}`);
      }

      if (!resource) {
        return handleEntityNotFound(res, resourceType);
      }

      // Custom access check
      if (customAccessCheck && !customAccessCheck(user, resource)) {
        return handleAuthorizationError(res, "Access denied");
      }

      // Standard ownership check for teachers
      if (checkOwnership && user.role === 'teacher') {
        if (!resource.teacherId || resource.teacherId !== user.id) {
          return handleAuthorizationError(res, `Access denied - you can only access your own ${resourceType}s`);
        }
      }

      // Attach resource to request for use in route handler
      (req as any)[resourceType] = resource;
      next();

    } catch (error) {
      handleRouteError(res, error, `check ${options.resourceType} access`);
    }
  };
}

/**
 * Specific middleware for project access
 */
export const checkProjectAccess = (options: Partial<ResourceAccessOptions> = {}) => 
  checkResourceAccess({ ...options, resourceType: 'project' });

/**
 * Specific middleware for milestone access
 */
export const checkMilestoneAccess = (options: Partial<ResourceAccessOptions> = {}) => 
  checkResourceAccess({ ...options, resourceType: 'milestone' });

/**
 * Specific middleware for assessment access
 */
export const checkAssessmentAccess = (options: Partial<ResourceAccessOptions> = {}) => 
  checkResourceAccess({ ...options, resourceType: 'assessment' });

/**
 * Specific middleware for submission access
 */
export const checkSubmissionAccess = (options: Partial<ResourceAccessOptions> = {}) => 
  checkResourceAccess({ ...options, resourceType: 'submission' });

/**
 * Student-specific access middleware for their own submissions/projects
 */
export function checkStudentAccess(resourceType: 'project' | 'submission') {
  return checkResourceAccess({
    resourceType,
    allowedRoles: ['student', 'teacher', 'admin'],
    customAccessCheck: (user, resource) => {
      if (user.role === 'student') {
        return resource.studentId === user.id;
      }
      return true; // Teachers and admins have access to all
    }
  });
}