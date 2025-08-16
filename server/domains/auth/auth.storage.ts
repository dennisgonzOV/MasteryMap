import {
  users,
  authTokens,
  projects,
  assessments,
  credentials,
  type User,
  type AuthToken,
  type InsertAuthToken,
  UpsertUser,
} from "../../../shared/schema";
import { db } from "../../db";
import { eq, and, ne } from "drizzle-orm";

// Interface for auth-specific storage operations
export interface IAuthStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<UpsertUser>): Promise<User>;

  // Auth token operations
  createAuthToken(token: InsertAuthToken): Promise<AuthToken>;
  getAuthToken(token: string): Promise<AuthToken | undefined>;
  deleteAuthToken(token: string): Promise<void>;
  deleteAuthTokensByUserId(userId: number): Promise<void>;

  // Admin operations
  getUsersBySchool(schoolId: number, excludeUserId: number): Promise<User[]>;
  getAnalyticsDashboard(): Promise<any>;
}

export class AuthStorage implements IAuthStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Auth token operations
  async createAuthToken(tokenData: InsertAuthToken): Promise<AuthToken> {
    const [token] = await db.insert(authTokens).values(tokenData).returning();
    return token;
  }

  async getAuthToken(token: string): Promise<AuthToken | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(authTokens)
      .where(eq(authTokens.token, token));
    return tokenRecord;
  }

  async deleteAuthToken(token: string): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.token, token));
  }

  async deleteAuthTokensByUserId(userId: number): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.userId, userId));
  }

  // Admin operations
  async getUsersBySchool(schoolId: number, excludeUserId: number): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(and(
        eq(users.schoolId, schoolId),
        ne(users.id, excludeUserId)
      ));
  }

  async getAnalyticsDashboard(): Promise<any> {
    // Get analytics data
    const [allUsers, allProjects, allAssessments, allCredentials] = await Promise.all([
      db.select().from(users),
      db.select().from(projects),
      db.select().from(assessments),
      db.select().from(credentials)
    ]);

    const analyticsData = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return u.updatedAt ? new Date(u.updatedAt) > oneMonthAgo : false;
      }).length,
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => p.status === 'active').length,
      totalAssessments: allAssessments.length,
      gradedAssessments: allAssessments.length, // Simplified since we don't have a graded field
      totalCredentials: allCredentials.length,
      recentActivity: [], // Could be implemented with activity tracking
      userGrowth: [], // Would need historical data
      projectStats: [], // Would need completion tracking
      competencyProgress: [] // Would need progress tracking
    };

    return analyticsData;
  }
}

// Export a singleton instance
export const authStorage = new AuthStorage();