import { AuthService } from "./auth.service";
import { authStorage, type IAuthStorage } from "./auth.storage";
import {
  createAnalyticsRouter,
  createAuthRouter,
  createRequireAuth,
  createRequireRole,
  type AuthServicePort,
} from "./auth.controller";

interface AuthDomainDependencies {
  authService?: AuthServicePort;
  storage?: IAuthStorage;
}

function createDefaultAuthService(): AuthServicePort {
  return {
    verifyAccessToken: (token) => AuthService.verifyAccessToken(token),
    registerUser: (userData) => AuthService.registerUser(userData),
    loginUser: (username, password) => AuthService.loginUser(username, password),
    setAuthCookies: (res, accessToken, refreshToken) =>
      AuthService.setAuthCookies(res, accessToken, refreshToken),
    revokeRefreshToken: (token) => AuthService.revokeRefreshToken(token),
    clearAuthCookies: (res) => AuthService.clearAuthCookies(res),
    refreshUserTokens: (refreshToken) => AuthService.refreshUserTokens(refreshToken),
    resetUserPassword: (userId, newPassword, adminUser) =>
      AuthService.resetUserPassword(userId, newPassword, adminUser),
  };
}

export function createAuthDomain(dependencies: AuthDomainDependencies = {}) {
  const storage = dependencies.storage ?? authStorage;
  const authService = dependencies.authService ?? createDefaultAuthService();

  const requireAuth = createRequireAuth({
    authService,
    authStorage: storage,
  });
  const requireRole = createRequireRole();

  const authRouter = createAuthRouter({
    authService,
    authStorage: storage,
    requireAuth,
  });

  const analyticsRouter = createAnalyticsRouter({
    authStorage: storage,
    requireAuth,
    requireRole,
  });

  return {
    authRouter,
    analyticsRouter,
    requireAuth,
    requireRole,
    authService,
    authStorage: storage,
  };
}
