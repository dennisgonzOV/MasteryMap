import {
  authService,
  authStorage,
  requireAuth,
  requireRole,
  type AuthServicePort,
  type IAuthStorage,
  type RequireAuthMiddleware,
  type RequireRoleMiddlewareFactory,
} from "../auth";
import { createAdminRouter } from "./admin.controller";

interface AdminDomainDependencies {
  authStorage?: IAuthStorage;
  authService?: Pick<AuthServicePort, "registerUser" | "resetUserPassword">;
  requireAuth?: RequireAuthMiddleware;
  requireRole?: RequireRoleMiddlewareFactory;
}

export function createAdminDomain(dependencies: AdminDomainDependencies = {}) {
  const storage = dependencies.authStorage ?? authStorage;
  const service = dependencies.authService ?? authService;
  const authMiddleware = dependencies.requireAuth ?? requireAuth;
  const roleMiddlewareFactory = dependencies.requireRole ?? requireRole;

  const adminRouter = createAdminRouter({
    authStorage: storage,
    authService: service,
    requireAuth: authMiddleware,
    requireRole: roleMiddlewareFactory,
  });

  return {
    adminRouter,
  };
}
