import { createAuthDomain } from "./composition";

const authDomain = createAuthDomain();

export const authRouter = authDomain.authRouter;
export const analyticsRouter = authDomain.analyticsRouter;
export const requireAuth = authDomain.requireAuth;
export const requireRole = authDomain.requireRole;
export const authService = authDomain.authService;
export const authStorage = authDomain.authStorage;

export { createAuthDomain } from "./composition";
export { AuthService, type JWTPayload } from "./auth.service";
export { type IAuthStorage } from "./auth.storage";
export type {
  AuthenticatedRequest,
  AuthServicePort,
  RequireAuthMiddleware,
  RequireRoleMiddlewareFactory,
} from "./auth.controller";
