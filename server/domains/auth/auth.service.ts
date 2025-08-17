import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import { authStorage } from './auth.storage';
import type { User, UpsertUser } from '../../../shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateTokens(payload: JWTPayload) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  static async storeRefreshToken(userId: number, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await authStorage.createAuthToken({
      userId,
      token,
      type: 'refresh',
      expiresAt,
    });
  }

  static async revokeRefreshToken(token: string): Promise<void> {
    await authStorage.deleteAuthToken(token);
  }

  static async validateRefreshToken(token: string): Promise<boolean> {
    const tokenRecord = await authStorage.getAuthToken(token);
    if (!tokenRecord || tokenRecord.type !== 'refresh') {
      return false;
    }
    
    if (tokenRecord.expiresAt < new Date()) {
      await authStorage.deleteAuthToken(token);
      return false;
    }
    
    return true;
  }

  static setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  static clearAuthCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  // Business logic methods
  static async registerUser(userData: UpsertUser): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Check if user already exists
    const existingUser = await authStorage.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);
    
    // Create user
    const user = await authStorage.createUser({
      ...userData,
      password: hashedPassword,
    });

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  static async loginUser(username: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Find user
    const user = await authStorage.getUserByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.comparePasswords(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  static async refreshUserTokens(refreshToken: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Validate refresh token
    const isValid = await this.validateRefreshToken(refreshToken);
    if (!isValid) {
      throw new Error('Invalid refresh token');
    }

    // Verify JWT
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Get user
    const user = await authStorage.getUser(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const tokens = this.generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Revoke old refresh token and store new one
    await this.revokeRefreshToken(refreshToken);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  static async resetUserPassword(userId: number, newPassword: string, adminUser: User): Promise<void> {
    // Ensure admin access
    if (adminUser.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Get the target user
    const targetUser = await authStorage.getUser(userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // Ensure admin can only reset passwords for users in their school (if applicable)
    if (adminUser.schoolId && targetUser.schoolId !== adminUser.schoolId) {
      throw new Error('Can only reset passwords for users in your school');
    }

    // Hash the new password
    const hashedPassword = await this.hashPassword(newPassword);
    
    // Update the user's password
    await authStorage.updateUser(userId, { password: hashedPassword });
  }
}