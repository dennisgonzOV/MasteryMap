import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  loginSchema,
  registerSchema,
  type UpsertUser,
  type User,
  UserRole,
} from "../../../shared/schema";
import type {
  AuthCurrentUserResponseDTO,
  AuthLoginRequestDTO,
  AuthLoginResponseDTO,
  AuthRegisterRequestDTO,
  AuthRegisterResponseDTO,
} from "../../../shared/contracts/api";
import { authLimiter } from "../../middleware/security";
import { createSuccessResponse, sendErrorResponse } from "../../utils/routeHelpers";
import { isTransientDatabaseError, withDatabaseRetry } from "../../db";
import type { IAuthStorage } from "./auth.storage";
import type { JWTPayload } from "./auth.service";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface AuthServicePort {
  verifyAccessToken(token: string): JWTPayload | null;
  registerUser(userData: UpsertUser): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>;
  loginUser(username: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>;
  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void;
  revokeRefreshToken(token: string): Promise<void>;
  clearAuthCookies(res: Response): void;
  refreshUserTokens(refreshToken: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>;
  resetUserPassword(userId: number, newPassword: string, adminUser: User): Promise<void>;
}

export type AuthStoragePort = Pick<
  IAuthStorage,
  "getUser" | "getUserByUsername" | "getAnalyticsDashboard"
>;

export type RequireAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

export type RequireRoleMiddlewareFactory = (
  ...roles: UserRole[]
) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;

function toAuthUserDTO(user: User): AuthLoginResponseDTO {
  const { password: _password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function createRequireAuth(dependencies: {
  authService: Pick<AuthServicePort, "verifyAccessToken">;
  authStorage: Pick<AuthStoragePort, "getUser">;
}): RequireAuthMiddleware {
  const { authService, authStorage } = dependencies;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.cookies.access_token;
      if (!accessToken) {
        sendErrorResponse(res, { message: "Unauthorized", statusCode: 401 });
        return;
      }

      const payload = authService.verifyAccessToken(accessToken);
      if (!payload) {
        sendErrorResponse(res, { message: "Invalid token", statusCode: 401 });
        return;
      }

      const user = await authStorage.getUser(payload.userId);
      if (!user) {
        sendErrorResponse(res, { message: "User not found", statusCode: 401 });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Auth middleware error for", req.path, ":", error);
      sendErrorResponse(res, { message: "Unauthorized", statusCode: 401 });
    }
  };
}

export function createRequireRole(): RequireRoleMiddlewareFactory {
  return (...roles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        sendErrorResponse(res, { message: "Unauthorized", statusCode: 401 });
        return;
      }

      const userRole = req.user.role as UserRole;
      const normalizedUserRole = userRole?.toLowerCase().trim() as UserRole;
      const normalizedRequiredRoles = roles.map((role) => role?.toLowerCase().trim() as UserRole);
      const hasAccess = normalizedRequiredRoles.includes(normalizedUserRole);

      if (!hasAccess) {
        sendErrorResponse(res, {
          message: "Forbidden",
          statusCode: 403,
          details:
            process.env.NODE_ENV === "development"
              ? {
                  userRole: normalizedUserRole,
                  requiredRoles: normalizedRequiredRoles,
                }
              : undefined,
        });
        return;
      }

      next();
    };
  };
}

interface AuthRouterDependencies {
  authService: AuthServicePort;
  authStorage: AuthStoragePort;
  requireAuth: RequireAuthMiddleware;
}

interface AnalyticsRouterDependencies {
  authStorage: AuthStoragePort;
  requireAuth: RequireAuthMiddleware;
  requireRole: RequireRoleMiddlewareFactory;
}

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const { authService, authStorage, requireAuth } = dependencies;
  const router = Router();

  router.use("/login", authLimiter);
  router.use("/register", authLimiter);

  router.post("/register", async (req, res) => {
    try {
      const userData: AuthRegisterRequestDTO = registerSchema.parse(req.body);

      const existingUser = await authStorage.getUserByUsername(userData.username);
      if (existingUser) {
        sendErrorResponse(res, { message: "Username already exists", statusCode: 400 });
        return;
      }

      const tier = userData.schoolId ? "enterprise" : "free";
      const { user, accessToken, refreshToken } = await authService.registerUser({
        ...userData,
        tier,
      });

      authService.setAuthCookies(res, accessToken, refreshToken);
      const userWithoutPassword: AuthRegisterResponseDTO = toAuthUserDTO(user);
      createSuccessResponse(res, userWithoutPassword, undefined, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendErrorResponse(res, {
          message: "Invalid input",
          statusCode: 400,
          details: error.errors,
        });
        return;
      }

      console.error("Registration error:", error);
      sendErrorResponse(res, {
        message: "Registration failed",
        statusCode: 500,
        error,
      });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { username, password }: AuthLoginRequestDTO = loginSchema.parse(req.body);

      const { user, accessToken, refreshToken } = await withDatabaseRetry(
        async () => authService.loginUser(username, password),
        {
          maxRetries: 2,
          baseDelayMs: 400,
          maxDelayMs: 2_500,
          context: "auth.login",
        },
      );
      authService.setAuthCookies(res, accessToken, refreshToken);

      const userWithoutPassword: AuthLoginResponseDTO = toAuthUserDTO(user);
      createSuccessResponse(res, userWithoutPassword);
    } catch (error) {
      if (isTransientDatabaseError(error)) {
        sendErrorResponse(res, {
          message: "Database is waking up. Please retry in a few seconds.",
          statusCode: 503,
        });
        return;
      }

      console.error("Login error:", error);
      sendErrorResponse(res, {
        message: "Invalid credentials",
        statusCode: 401,
        error,
      });
    }
  });

  router.post("/logout", async (req, res) => {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (refreshToken) {
        await authService.revokeRefreshToken(refreshToken);
      }

      authService.clearAuthCookies(res);
      createSuccessResponse(res, { message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      sendErrorResponse(res, {
        message: "Logout failed",
        statusCode: 500,
        error,
      });
    }
  });

  router.post("/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (!refreshToken) {
        sendErrorResponse(res, { message: "No refresh token", statusCode: 401 });
        return;
      }

      const { accessToken, refreshToken: newRefreshToken } = await authService.refreshUserTokens(refreshToken);
      authService.setAuthCookies(res, accessToken, newRefreshToken);

      createSuccessResponse(res, { message: "Tokens refreshed" });
    } catch (error) {
      console.error("Refresh error:", error);
      sendErrorResponse(res, {
        message: "Token refresh failed",
        statusCode: 401,
        error,
      });
    }
  });

  router.post("/admin-reset-password", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        sendErrorResponse(res, { message: "Not authenticated", statusCode: 401 });
        return;
      }

      const { userId, newPassword } = req.body as {
        userId?: number;
        newPassword?: string;
      };

      if (!userId || !newPassword) {
        sendErrorResponse(res, {
          message: "User ID and new password are required",
          statusCode: 400,
        });
        return;
      }

      await authService.resetUserPassword(userId, newPassword, req.user);
      createSuccessResponse(res, { message: "Password reset successfully" });
    } catch (error) {
      console.error("Admin password reset error:", error);
      const errorMessage = getErrorMessage(error);

      if (errorMessage === "Admin access required") {
        sendErrorResponse(res, { message: errorMessage, statusCode: 403 });
        return;
      }
      if (errorMessage === "User not found") {
        sendErrorResponse(res, { message: errorMessage, statusCode: 404 });
        return;
      }
      if (errorMessage === "Can only reset passwords for users in your school") {
        sendErrorResponse(res, { message: errorMessage, statusCode: 403 });
        return;
      }

      sendErrorResponse(res, {
        message: "Password reset failed",
        statusCode: 500,
        error,
      });
    }
  });

  router.get("/user", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        sendErrorResponse(res, { message: "Not authenticated", statusCode: 401 });
        return;
      }

      const userWithoutPassword: AuthCurrentUserResponseDTO = toAuthUserDTO(req.user);
      createSuccessResponse(res, userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      sendErrorResponse(res, {
        message: "Failed to get user",
        statusCode: 500,
        error,
      });
    }
  });

  return router;
}

export function createAnalyticsRouter(dependencies: AnalyticsRouterDependencies): Router {
  const { authStorage, requireAuth, requireRole } = dependencies;
  const router = Router();

  router.get(
    "/dashboard",
    requireAuth,
    requireRole(UserRole.ADMIN),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user || !req.user.schoolId) {
          sendErrorResponse(res, { message: "Admin school not found", statusCode: 400 });
          return;
        }

        const analyticsData = await authStorage.getAnalyticsDashboard(req.user.schoolId);
        createSuccessResponse(res, analyticsData);
      } catch (error) {
        console.error("Analytics error:", error);
        sendErrorResponse(res, {
          message: "Failed to fetch analytics data",
          statusCode: 500,
          error,
        });
      }
    },
  );

  return router;
}
