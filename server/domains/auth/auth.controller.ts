import { Router } from 'express';
import { AuthService, type JWTPayload } from './auth.service';
import { authStorage } from './auth.storage';
import { registerSchema, loginSchema, type User, UserRole } from '../../../shared/schema';
import type {
  AuthCurrentUserResponseDTO,
  AuthLoginRequestDTO,
  AuthLoginResponseDTO,
  AuthRegisterRequestDTO,
  AuthRegisterResponseDTO,
} from '../../../shared/contracts/api';
import { z } from 'zod';
import { authLimiter, createErrorResponse } from '../../middleware/security';
import type { Request, Response, NextFunction } from 'express';

// Define AuthenticatedRequest interface
export interface AuthenticatedRequest extends Request {
  user?: User;
}

function toAuthUserDTO(user: User): AuthLoginResponseDTO {
  const { password: _password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Authentication middleware
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = AuthService.verifyAccessToken(accessToken);
    if (!payload) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await authStorage.getUser(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error for', req.path, ':', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Role-based authorization middleware
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = req.user.role as UserRole;

    // Ensure both user role and required roles are properly typed
    const normalizedUserRole = userRole?.toLowerCase().trim() as UserRole;
    const normalizedRequiredRoles = roles.map(role => role?.toLowerCase().trim() as UserRole);

    const hasAccess = normalizedRequiredRoles.includes(normalizedUserRole);

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Forbidden',
        details: process.env.NODE_ENV === 'development' ? {
          userRole: normalizedUserRole,
          requiredRoles: normalizedRequiredRoles
        } : undefined
      });
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

  // Register route
  router.post('/register', async (req, res) => {
    try {
      // Validate request body against schema
      const userData: AuthRegisterRequestDTO = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await authStorage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // If schoolId is provided, verify it exists
      if (userData.schoolId) {
        // We might want to verify school exists here, but foreign key constraint handles it too
        // For now, we trust the input validation
      }

      // Determine tier based on schoolId presence (no school = free tier)
      // Note: This logic can be refined later if we have paid individual tiers
      const tier = userData.schoolId ? 'enterprise' : 'free';

      // Register user using service
      const { user, accessToken, refreshToken } = await AuthService.registerUser({
        ...userData,
        tier
      });

      // Set cookies
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      // Return user data (without password)
      const userWithoutPassword: AuthRegisterResponseDTO = toAuthUserDTO(user);
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Login route
  router.post('/login', async (req, res) => {
    try {
      const { username, password }: AuthLoginRequestDTO = loginSchema.parse(req.body);

      const { user, accessToken, refreshToken } = await AuthService.loginUser(username, password);

      // Set cookies
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      // Return user data (without password)
      const userWithoutPassword: AuthLoginResponseDTO = toAuthUserDTO(user);
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      // Return generic error message for security
      res.status(401).json({ message: 'Invalid credentials' });
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

      const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshUserTokens(refreshToken);

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
      const userWithoutPassword: AuthCurrentUserResponseDTO = toAuthUserDTO(req.user);
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
  router.get('/dashboard', requireAuth, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res) => {
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
export const analyticsRouter = createAnalyticsRouter();
