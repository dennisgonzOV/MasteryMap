import { Router } from 'express';
import { AuthService, type JWTPayload } from './auth.service';
import { authStorage } from './auth.storage';
import { registerSchema, loginSchema, type User } from '../../../shared/schema';
import { authLimiter, createErrorResponse } from '../../middleware/security';
import type { Request, Response, NextFunction } from 'express';

// Define AuthenticatedRequest interface
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Authentication middleware
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      console.log('RequireAuth: No access token found for', req.path);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = AuthService.verifyAccessToken(accessToken);
    if (!payload) {
      console.log('RequireAuth: Invalid token for', req.path);
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await authStorage.getUser(payload.userId);
    if (!user) {
      console.log('RequireAuth: User not found for', req.path);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('RequireAuth: Successfully authenticated user', user.id, 'for', req.path);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error for', req.path, ':', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Role-based authorization middleware
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};

// Create auth router
export const createAuthRouter = () => {
  const router = Router();
  
  // Apply auth-specific rate limiting
  router.use('/login', authLimiter);
  router.use('/register', authLimiter);

  // Register route - DISABLED
  router.post('/register', async (req, res) => {
    res.status(403).json({ 
      message: 'Registration is currently disabled. Please contact your administrator for account access.' 
    });
  });

  // Login route
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const { user, accessToken, refreshToken } = await AuthService.loginUser(email, password);

      // Set cookies
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      const errorResponse = createErrorResponse(error, 'Login failed', 401);
      res.status(401).json(errorResponse);
    }
  });

  // Logout route
  router.post('/logout', async (req, res) => {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (refreshToken) {
        await AuthService.revokeRefreshToken(refreshToken);
      }
      
      AuthService.clearAuthCookies(res);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  // Refresh token route
  router.post('/refresh', async (req, res) => {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ message: 'No refresh token' });
      }

      const { user, accessToken, refreshToken: newRefreshToken } = await AuthService.refreshUserTokens(refreshToken);

      // Set new cookies
      AuthService.setAuthCookies(res, accessToken, newRefreshToken);

      res.json({ message: 'Tokens refreshed' });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({ message: 'Token refresh failed' });
    }
  });

  // Admin password reset route
  router.post('/admin-reset-password', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ message: 'User ID and new password are required' });
      }

      await AuthService.resetUserPassword(userId, newPassword, req.user);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Admin password reset error:', error);
      if (error instanceof Error) {
        if (error.message === 'Admin access required') {
          return res.status(403).json({ message: error.message });
        }
        if (error.message === 'User not found') {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Can only reset passwords for users in your school') {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: 'Password reset failed' });
    }
  });

  // Get current user route
  router.get('/user', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  return router;
};

// Create analytics router
export const createAnalyticsRouter = () => {
  const router = Router();

  // Analytics endpoint for admin dashboard
  router.get('/dashboard', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      // Get analytics data
      const analyticsData = await authStorage.getAnalyticsDashboard();

      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  return router;
};

// Create admin router
export const createAdminRouter = () => {
  const router = Router();

  // Get users from admin's school for password reset
  router.get('/school-users', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      const adminId = req.user!.id;

      // Get admin's school ID
      const admin = await authStorage.getUser(adminId);
      if (!admin || !admin.schoolId) {
        return res.status(400).json({ message: "Admin school not found" });
      }

      const schoolId = admin.schoolId;

      // Get all users from the same school (excluding the admin themselves)
      const schoolUsers = await authStorage.getUsersBySchool(schoolId, adminId);

      // Format the response to include only the fields we need
      const formattedUsers = schoolUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId
      }));

      res.json(formattedUsers);
    } catch (error) {
      console.error('Error fetching school users:', error);
      res.status(500).json({ message: "Failed to fetch school users" });
    }
  });

  // Analytics endpoint for admin dashboard
  router.get('/analytics/dashboard', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
    try {
      // Get analytics data
      const analyticsData = await authStorage.getAnalyticsDashboard();

      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  return router;
};

// Export the configured routers
export const authRouter = createAuthRouter();
export const adminRouter = createAdminRouter();
export const analyticsRouter = createAnalyticsRouter();