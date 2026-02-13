import { Router } from 'express';
import { AuthService } from '../auth/auth.service';
import { authStorage } from '../auth/auth.storage';
import { UserRole } from '../../../shared/schema';
import { z } from 'zod';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../auth/auth.controller';

const adminCreateUserSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
});

// Create admin router
export const createAdminRouter = () => {
    const router = Router();

    // Middleware to ensure all routes require admin access
    router.use(requireAuth, requireRole(UserRole.ADMIN));

    // Get users from admin's school
    router.get('/users', async (req: AuthenticatedRequest, res) => {
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
                username: user.username,
                role: user.role,
                schoolId: user.schoolId
            }));

            res.json(formattedUsers);
        } catch (error) {
            console.error('Error fetching school users:', error);
            res.status(500).json({ message: "Failed to fetch school users" });
        }
    });

    // Create new user (Student or Teacher)
    router.post('/users', async (req: AuthenticatedRequest, res) => {
        try {
            const adminId = req.user!.id;
            const admin = await authStorage.getUser(adminId);

            if (!admin || !admin.schoolId) {
                return res.status(400).json({ message: "Admin school not found" });
            }

            const parsed = adminCreateUserSchema.parse(req.body);

            if (parsed.role === UserRole.ADMIN) {
                return res.status(403).json({ message: "Admins cannot create other admins" });
            }

            const existingUser = await authStorage.getUserByUsername(parsed.username);
            if (existingUser) {
                return res.status(400).json({ message: 'Username already exists' });
            }

            const { user } = await AuthService.registerUser({
                ...parsed,
                firstName: null,
                lastName: null,
                email: null,
                schoolName: null,
                schoolId: admin.schoolId,
                tier: 'enterprise',
            });

            // Return user data (without password)
            const { password: _, ...userWithoutPassword } = user;
            res.status(201).json(userWithoutPassword);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.errors });
            }
            console.error('Create user error:', error);
            res.status(500).json({ message: "Failed to create user" });
        }
    });

    // Bulk create users
    router.post('/users/bulk', async (req: AuthenticatedRequest, res) => {
        try {
            const adminId = req.user!.id;
            const admin = await authStorage.getUser(adminId);

            if (!admin || !admin.schoolId) {
                return res.status(400).json({ message: "Admin school not found" });
            }

            // Expecting array of objects { username, password, role }
            const bulkSchema = z.array(adminCreateUserSchema).max(50, "Maximum 50 users per bulk request");
            const parsedUsers = bulkSchema.parse(req.body);

            const results = {
                created: [] as any[],
                failed: [] as any[]
            };

            // Process sequentially to avoid race conditions or DB locks if strictly serial
            // Parallel is fine too but easier to track errors sequentially for now or Promise.all
            // Let's use loop for better error isolation per user
            for (const userData of parsedUsers) {
                try {
                    if (userData.role === UserRole.ADMIN) {
                        results.failed.push({ username: userData.username, reason: "Cannot create admin in bulk" });
                        continue;
                    }

                    // Check existence
                    // Optimization: could fetch all existing usernames in one query if list is long, 
                    // but for <50 and minimal load, individual checks are acceptable simplicity.
                    const existingUser = await authStorage.getUserByUsername(userData.username);
                    if (existingUser) {
                        results.failed.push({ username: userData.username, reason: "Username already exists" });
                        continue;
                    }

                    const { user } = await AuthService.registerUser({
                        ...userData,
                        firstName: null,
                        lastName: null,
                        email: null,
                        schoolName: null,
                        schoolId: admin.schoolId,
                        tier: 'enterprise',
                    });

                    const { password: _, ...userWithoutPassword } = user;
                    results.created.push(userWithoutPassword);

                } catch (err: any) {
                    console.error(`Failed to create user ${userData.username}:`, err);
                    results.failed.push({ username: userData.username, reason: err.message || "Unknown error" });
                }
            }

            res.status(200).json(results);

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Invalid input', errors: error.errors });
            }
            console.error('Bulk create user error:', error);
            res.status(500).json({ message: "Failed to process bulk creation" });
        }
    });

    // Delete user
    router.delete('/users/:id', async (req: AuthenticatedRequest, res) => {
        try {
            const userIdToDelete = parseInt(req.params.id);
            const adminId = req.user!.id;

            if (isNaN(userIdToDelete)) {
                return res.status(400).json({ message: "Invalid user ID" });
            }

            if (userIdToDelete === adminId) {
                return res.status(400).json({ message: "Cannot delete yourself" });
            }

            const userToDelete = await authStorage.getUser(userIdToDelete);
            if (!userToDelete) {
                return res.status(404).json({ message: "User not found" });
            }

            // Check if user belongs to the same school
            const admin = await authStorage.getUser(adminId);
            if (!admin || !admin.schoolId || userToDelete.schoolId !== admin.schoolId) {
                return res.status(403).json({ message: "You can only delete users from your school" });
            }

            // Perform deletion
            await authStorage.deleteUser(userIdToDelete);
            // Also delete auth tokens? AuthStorage.deleteUser logic might need to cascade or we rely on DB cascade?
            // The schema has `onDelete: 'cascade'` for many relations but maybe not all. 
            // `authTokens` has `references(() => users.id)` but NO cascade in schema definition provided in context earlier!
            // Wait, `authTokens` table definition: `userId: integer("user_id").references(() => users.id).notNull()`
            // It DOES NOT have `onDelete: cascade`.
            // I should manually delete tokens or update schema. For now, since `deleteUser` in storage blindly deletes user, 
            // let's check `authStorage`.
            // `authStorage.deleteUser` only deletes from `users`. If DB doesn't cascade, this might fail.
            // Let's add manual token deletion to be safe, or assume DB is set up right (schema.ts didn't show cascade for authTokens).
            // safely delete tokens first
            await authStorage.deleteAuthTokensByUserId(userIdToDelete);

            res.json({ message: "User deleted successfully" });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ message: "Failed to delete user" });
        }
    });

    // Admin password reset route (Migrated from auth.controller)
    // Reuse existing logic or call service
    router.post('/users/:id/password', async (req: AuthenticatedRequest, res) => {
        try {
            const userIdToReset = parseInt(req.params.id);
            const { newPassword } = req.body;

            if (isNaN(userIdToReset) || !newPassword) {
                return res.status(400).json({ message: 'Invalid user ID or missing password' });
            }

            await AuthService.resetUserPassword(userIdToReset, newPassword, req.user!);

            res.json({ message: 'Password reset successfully' });
        } catch (error) {
            console.error('Admin password reset error:', error);
            if (error instanceof Error) {
                if (error.message.includes('Admin access required') || error.message.includes('Can only reset')) {
                    return res.status(403).json({ message: error.message });
                }
                if (error.message === 'User not found') {
                    return res.status(404).json({ message: error.message });
                }
            }
            res.status(500).json({ message: 'Password reset failed' });
        }
    });

    // Analytics endpoint for admin dashboard (Migrated from auth.controller)
    router.get('/analytics/dashboard', async (req: AuthenticatedRequest, res) => {
        try {
            // Get analytics data
            const analyticsData = await authStorage.getAnalyticsDashboard();

            res.json(analyticsData);
        } catch (error) {
            console.error('Analytics error:', error);
            res.status(500).json({ message: "Failed to fetch analytics data" });
        }
    });

    // Legacy route for school users to support existing frontend before full migration
    // The existing frontend calls `/api/admin/school-users`
    router.get('/school-users', async (req: AuthenticatedRequest, res) => {
        // Same logic as /users
        try {
            const adminId = req.user!.id;
            const admin = await authStorage.getUser(adminId);
            if (!admin || !admin.schoolId) {
                return res.status(400).json({ message: "Admin school not found" });
            }
            const schoolUsers = await authStorage.getUsersBySchool(admin.schoolId, adminId);
            const formattedUsers = schoolUsers.map(user => ({
                id: user.id,
                username: user.username,
                role: user.role,
                schoolId: user.schoolId
            }));
            res.json(formattedUsers);
        } catch (error) {
            console.error('Error fetching school users:', error);
            res.status(500).json({ message: "Failed to fetch school users" });
        }
    });

    // Backwards compatibility for password reset
    router.post('/reset-password', async (req: AuthenticatedRequest, res) => {
        // Logic for /api/admin/reset-password which might expect userId in body
        try {
            const { userId, newPassword } = req.body;
            if (!userId || !newPassword) return res.status(400).json({ message: "Missing fields" });

            await AuthService.resetUserPassword(userId, newPassword, req.user!);
            res.json({ message: 'Password reset successfully' });
        } catch (error) {
            console.error('Admin password reset error:', error);
            res.status(500).json({ message: 'Password reset failed' });
        }
    });

    return router;
};
