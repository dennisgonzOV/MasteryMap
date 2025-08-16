// Export all auth domain components
export { authRouter, adminRouter, analyticsRouter, requireAuth, requireRole, type AuthenticatedRequest } from './auth.controller';
export { AuthService, type JWTPayload } from './auth.service';
export { authStorage, type IAuthStorage } from './auth.storage';