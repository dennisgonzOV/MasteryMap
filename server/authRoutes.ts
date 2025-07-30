import type { Express } from 'express';
import { AuthService, type AuthenticatedRequest, requireAuth } from './auth';
import { ModularStorage } from './storage.modular';
const storage = new ModularStorage();
import { registerSchema, loginSchema } from '@shared/schema';
import cookieParser from 'cookie-parser';

export function setupAuthRoutes(app: Express) {
  // Add cookie parser middleware
  app.use(cookieParser());

  // Register route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(userData.password);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate tokens
      const tokens = AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token
      await AuthService.storeRefreshToken(user.id, tokens.refreshToken);

      // Set cookies
      AuthService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await AuthService.comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate tokens
      const tokens = AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token
      await AuthService.storeRefreshToken(user.id, tokens.refreshToken);

      // Set cookies
      AuthService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ message: 'Login failed' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', async (req, res) => {
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
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ message: 'No refresh token' });
      }

      // Validate refresh token
      const isValid = await AuthService.validateRefreshToken(refreshToken);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      // Verify JWT
      const payload = AuthService.verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      // Get user
      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Generate new tokens
      const tokens = AuthService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Revoke old refresh token and store new one
      await AuthService.revokeRefreshToken(refreshToken);
      await AuthService.storeRefreshToken(user.id, tokens.refreshToken);

      // Set new cookies
      AuthService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.json({ message: 'Tokens refreshed' });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({ message: 'Token refresh failed' });
    }
  });

  // Admin password reset route
  app.post('/api/auth/admin-reset-password', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ message: 'User ID and new password are required' });
      }

      // Get the target user
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Ensure admin can only reset passwords for users in their school (if applicable)
      if (req.user.schoolId && targetUser.schoolId !== req.user.schoolId) {
        return res.status(403).json({ message: 'Can only reset passwords for users in your school' });
      }

      // Hash the new password
      const hashedPassword = await AuthService.hashPassword(newPassword);
      
      // Update the user's password
      await storage.updateUserPassword(userId, hashedPassword);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Admin password reset error:', error);
      res.status(500).json({ message: 'Password reset failed' });
    }
  });

  // Get current user route
  app.get('/api/auth/user', requireAuth, async (req: AuthenticatedRequest, res) => {
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
}