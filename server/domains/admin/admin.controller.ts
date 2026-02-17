import { Router, type Response } from "express";
import { z } from "zod";
import { UserRole, gradeLevelEnum, type User } from "../../../shared/schema";
import {
  createSuccessResponse,
  sendErrorResponse,
} from "../../utils/routeHelpers";
import type {
  AuthenticatedRequest,
  AuthServicePort,
  IAuthStorage,
  RequireAuthMiddleware,
  RequireRoleMiddlewareFactory,
} from "../auth";

const adminCreateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
  grade: z.enum(gradeLevelEnum).optional(),
}).superRefine((data, ctx) => {
  if (data.role === UserRole.STUDENT && !data.grade) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["grade"],
      message: "Grade is required for students",
    });
  }
});

type AdminAuthStorage = Pick<
  IAuthStorage,
  | "getUser"
  | "getUsersBySchool"
  | "getUserByUsername"
  | "deleteUser"
  | "deleteAuthTokensByUserId"
  | "getAnalyticsDashboard"
>;

type AdminAuthService = Pick<AuthServicePort, "registerUser" | "resetUserPassword">;

interface AdminRouterDependencies {
  authStorage: AdminAuthStorage;
  authService: AdminAuthService;
  requireAuth: RequireAuthMiddleware;
  requireRole: RequireRoleMiddlewareFactory;
}

type UserWithoutPassword = Omit<User, "password">;

interface BulkCreateUsersResult {
  created: UserWithoutPassword[];
  failed: Array<{ username: string; reason: string }>;
}

function sanitizeUser(user: User): UserWithoutPassword {
  const { password: _password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function resolveAdminContext(
  req: AuthenticatedRequest,
  res: Response,
  authStorage: Pick<IAuthStorage, "getUser">,
): Promise<{ admin: User; schoolId: number } | null> {
  if (!req.user) {
    sendErrorResponse(res, { message: "Unauthorized", statusCode: 401 });
    return null;
  }

  const admin = await authStorage.getUser(req.user.id);
  if (!admin || !admin.schoolId) {
    sendErrorResponse(res, { message: "Admin school not found", statusCode: 400 });
    return null;
  }

  return { admin, schoolId: admin.schoolId };
}

export function createAdminRouter(dependencies: AdminRouterDependencies): Router {
  const { authStorage, authService, requireAuth, requireRole } = dependencies;
  const router = Router();

  router.use(requireAuth, requireRole(UserRole.ADMIN));

  router.get("/users", async (req: AuthenticatedRequest, res) => {
    try {
      const context = await resolveAdminContext(req, res, authStorage);
      if (!context) {
        return;
      }

      const schoolUsers = await authStorage.getUsersBySchool(context.schoolId, context.admin.id);
      const formattedUsers = schoolUsers.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId,
      }));

      createSuccessResponse(res, formattedUsers);
    } catch (error) {
      console.error("Error fetching school users:", error);
      sendErrorResponse(res, {
        message: "Failed to fetch school users",
        statusCode: 500,
        error,
      });
    }
  });

  router.post("/users", async (req: AuthenticatedRequest, res) => {
    try {
      const context = await resolveAdminContext(req, res, authStorage);
      if (!context) {
        return;
      }

      const parsed = adminCreateUserSchema.parse(req.body);
      if (parsed.role === UserRole.ADMIN) {
        sendErrorResponse(res, { message: "Admins cannot create other admins", statusCode: 403 });
        return;
      }

      const existingUser = await authStorage.getUserByUsername(parsed.username);
      if (existingUser) {
        sendErrorResponse(res, { message: "Username already exists", statusCode: 400 });
        return;
      }

      const { user } = await authService.registerUser({
        ...parsed,
        grade: parsed.role === UserRole.STUDENT ? parsed.grade : null,
        firstName: null,
        lastName: null,
        email: null,
        schoolName: null,
        schoolId: context.schoolId,
        tier: "enterprise",
      });

      createSuccessResponse(res, sanitizeUser(user), undefined, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendErrorResponse(res, {
          message: "Invalid input",
          statusCode: 400,
          details: error.errors,
        });
        return;
      }

      console.error("Create user error:", error);
      sendErrorResponse(res, {
        message: "Failed to create user",
        statusCode: 500,
        error,
      });
    }
  });

  router.post("/users/bulk", async (req: AuthenticatedRequest, res) => {
    try {
      const context = await resolveAdminContext(req, res, authStorage);
      if (!context) {
        return;
      }

      const bulkSchema = z.array(adminCreateUserSchema).max(50, "Maximum 50 users per bulk request");
      const parsedUsers = bulkSchema.parse(req.body);

      const results: BulkCreateUsersResult = {
        created: [],
        failed: [],
      };

      for (const userData of parsedUsers) {
        if (userData.role === UserRole.ADMIN) {
          results.failed.push({
            username: userData.username,
            reason: "Cannot create admin in bulk",
          });
          continue;
        }

        try {
          const existingUser = await authStorage.getUserByUsername(userData.username);
          if (existingUser) {
            results.failed.push({
              username: userData.username,
              reason: "Username already exists",
            });
            continue;
          }

          const { user } = await authService.registerUser({
            ...userData,
            grade: userData.role === UserRole.STUDENT ? userData.grade : null,
            firstName: null,
            lastName: null,
            email: null,
            schoolName: null,
            schoolId: context.schoolId,
            tier: "enterprise",
          });

          results.created.push(sanitizeUser(user));
        } catch (error) {
          const errorMessage = getErrorMessage(error);
          console.error(`Failed to create user ${userData.username}:`, error);
          results.failed.push({
            username: userData.username,
            reason: errorMessage,
          });
        }
      }

      createSuccessResponse(res, results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendErrorResponse(res, {
          message: "Invalid input",
          statusCode: 400,
          details: error.errors,
        });
        return;
      }

      console.error("Bulk create user error:", error);
      sendErrorResponse(res, {
        message: "Failed to process bulk creation",
        statusCode: 500,
        error,
      });
    }
  });

  router.delete("/users/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const context = await resolveAdminContext(req, res, authStorage);
      if (!context) {
        return;
      }

      const userIdToDelete = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(userIdToDelete)) {
        sendErrorResponse(res, { message: "Invalid user ID", statusCode: 400 });
        return;
      }

      if (userIdToDelete === context.admin.id) {
        sendErrorResponse(res, { message: "Cannot delete yourself", statusCode: 400 });
        return;
      }

      const userToDelete = await authStorage.getUser(userIdToDelete);
      if (!userToDelete) {
        sendErrorResponse(res, { message: "User not found", statusCode: 404 });
        return;
      }

      if (userToDelete.schoolId !== context.schoolId) {
        sendErrorResponse(res, {
          message: "You can only delete users from your school",
          statusCode: 403,
        });
        return;
      }

      await authStorage.deleteAuthTokensByUserId(userIdToDelete);
      await authStorage.deleteUser(userIdToDelete);

      createSuccessResponse(res, { message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      sendErrorResponse(res, {
        message: "Failed to delete user",
        statusCode: 500,
        error,
      });
    }
  });

  router.post("/users/:id/password", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        sendErrorResponse(res, { message: "Unauthorized", statusCode: 401 });
        return;
      }

      const userIdToReset = Number.parseInt(req.params.id, 10);
      const { newPassword } = req.body as { newPassword?: string };

      if (Number.isNaN(userIdToReset) || !newPassword) {
        sendErrorResponse(res, {
          message: "Invalid user ID or missing password",
          statusCode: 400,
        });
        return;
      }

      await authService.resetUserPassword(userIdToReset, newPassword, req.user);
      createSuccessResponse(res, { message: "Password reset successfully" });
    } catch (error) {
      console.error("Admin password reset error:", error);
      const errorMessage = getErrorMessage(error);

      if (errorMessage.includes("Admin access required") || errorMessage.includes("Can only reset")) {
        sendErrorResponse(res, { message: errorMessage, statusCode: 403 });
        return;
      }
      if (errorMessage === "User not found") {
        sendErrorResponse(res, { message: errorMessage, statusCode: 404 });
        return;
      }

      sendErrorResponse(res, {
        message: "Password reset failed",
        statusCode: 500,
        error,
      });
    }
  });

  router.get("/analytics/dashboard", async (req: AuthenticatedRequest, res) => {
    try {
      const context = await resolveAdminContext(req, res, authStorage);
      if (!context) {
        return;
      }

      const analyticsData = await authStorage.getAnalyticsDashboard(context.schoolId);
      createSuccessResponse(res, analyticsData);
    } catch (error) {
      console.error("Analytics error:", error);
      sendErrorResponse(res, {
        message: "Failed to fetch analytics data",
        statusCode: 500,
        error,
      });
    }
  });

  router.get("/school-users", async (req: AuthenticatedRequest, res) => {
    try {
      const context = await resolveAdminContext(req, res, authStorage);
      if (!context) {
        return;
      }

      const schoolUsers = await authStorage.getUsersBySchool(context.schoolId, context.admin.id);
      const formattedUsers = schoolUsers.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId,
      }));

      createSuccessResponse(res, formattedUsers);
    } catch (error) {
      console.error("Error fetching school users:", error);
      sendErrorResponse(res, {
        message: "Failed to fetch school users",
        statusCode: 500,
        error,
      });
    }
  });

  router.post("/reset-password", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        sendErrorResponse(res, { message: "Unauthorized", statusCode: 401 });
        return;
      }

      const { userId, newPassword } = req.body as {
        userId?: number;
        newPassword?: string;
      };

      if (!userId || !newPassword) {
        sendErrorResponse(res, { message: "Missing fields", statusCode: 400 });
        return;
      }

      await authService.resetUserPassword(userId, newPassword, req.user);
      createSuccessResponse(res, { message: "Password reset successfully" });
    } catch (error) {
      console.error("Admin password reset error:", error);
      sendErrorResponse(res, {
        message: "Password reset failed",
        statusCode: 500,
        error,
      });
    }
  });

  return router;
}
