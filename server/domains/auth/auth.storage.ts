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
import { eq, and, ne, sql } from "drizzle-orm";

interface AnalyticsDashboardData {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalAssessments: number;
  gradedAssessments: number;
  totalCredentials: number;
  recentActivity: unknown[];
  userGrowth: unknown[];
  projectStats: unknown[];
  competencyProgress: unknown[];
}

// Interface for auth-specific storage operations
export interface IAuthStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<UpsertUser>): Promise<User>;

  // Auth token operations
  createAuthToken(token: InsertAuthToken): Promise<AuthToken>;
  getAuthToken(token: string): Promise<AuthToken | undefined>;
  deleteAuthToken(token: string): Promise<void>;
  deleteAuthTokensByUserId(userId: number): Promise<void>;

  // Admin operations
  getUsersBySchool(schoolId: number, excludeUserId: number): Promise<User[]>;
  getAnalyticsDashboard(schoolId?: number): Promise<AnalyticsDashboardData>;
  deleteUser(id: number): Promise<void>;
}

export class AuthStorage implements IAuthStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`lower(${users.username}) = lower(${username})`);
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

  async getAnalyticsDashboard(schoolId?: number): Promise<AnalyticsDashboardData> {
    const [allUsers, allProjects, allAssessments, allCredentials] = await Promise.all([
      schoolId
        ? db.select().from(users).where(eq(users.schoolId, schoolId))
        : db.select().from(users),
      schoolId
        ? db.select().from(projects).where(eq(projects.schoolId, schoolId))
        : db.select().from(projects),
      schoolId
        ? db
            .select({ id: assessments.id })
            .from(assessments)
            .innerJoin(users, eq(assessments.createdBy, users.id))
            .where(eq(users.schoolId, schoolId))
        : db.select({ id: assessments.id }).from(assessments),
      schoolId
        ? db
            .select({ id: credentials.id })
            .from(credentials)
            .innerJoin(users, eq(credentials.studentId, users.id))
            .where(eq(users.schoolId, schoolId))
        : db.select({ id: credentials.id }).from(credentials),
    ]);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((user) => {
        return user.updatedAt ? new Date(user.updatedAt) > oneMonthAgo : false;
      }).length,
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter((project) => project.status === 'active').length,
      totalAssessments: allAssessments.length,
      gradedAssessments: allAssessments.length,
      totalCredentials: allCredentials.length,
      recentActivity: [],
      userGrowth: [],
      projectStats: [],
      competencyProgress: []
    };
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

// Export a singleton instance
export const authStorage = new AuthStorage();
