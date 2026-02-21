import {
  users,
  authTokens,
  projects,
  assessments,
  credentials,
  submissions,
  type User,
  type AuthToken,
  type InsertAuthToken,
  UpsertUser,
  UserRole,
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
  roleDistribution: {
    students: number;
    teachers: number;
    admins: number;
  };
  gradeDistribution: Array<{
    grade: string;
    count: number;
  }>;
  userGrowth: Array<{
    month: string;
    users: number;
    projects: number;
  }>;
  weeklyActivity: Array<{
    day: string;
    users: number;
    submissions: number;
  }>;
  projectStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
  needsAttention: {
    overdueProjects: number;
    ungradedSubmissions: number;
    draftProjects: number;
  };
  recentActivity: Array<{
    id: string;
    type: "user_created" | "project_created" | "submission_graded" | "credential_awarded";
    message: string;
    timestamp: string;
    severity: "info" | "success";
  }>;
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
  private isSameOrAfter(date: Date, start: Date): boolean {
    return date.getTime() >= start.getTime();
  }

  private isBefore(date: Date, end: Date): boolean {
    return date.getTime() < end.getTime();
  }

  private toDate(value: Date | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    return value instanceof Date ? value : new Date(value);
  }

  private formatMonthLabel(date: Date): string {
    return date.toLocaleString("en-US", { month: "short" });
  }

  private formatDayLabel(date: Date): string {
    return date.toLocaleString("en-US", { weekday: "short" });
  }

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
    const [allUsers, allProjects, allAssessments, allCredentials, allSubmissions] = await Promise.all([
      schoolId
        ? db.select().from(users).where(eq(users.schoolId, schoolId))
        : db.select().from(users),
      schoolId
        ? db.select().from(projects).where(eq(projects.schoolId, schoolId))
        : db.select().from(projects),
      schoolId
        ? db
            .select({ id: assessments.id, createdAt: assessments.createdAt, title: assessments.title })
            .from(assessments)
            .innerJoin(users, eq(assessments.createdBy, users.id))
            .where(eq(users.schoolId, schoolId))
        : db.select({ id: assessments.id, createdAt: assessments.createdAt, title: assessments.title }).from(assessments),
      schoolId
        ? db
            .select({ id: credentials.id, title: credentials.title, awardedAt: credentials.awardedAt })
            .from(credentials)
            .innerJoin(users, eq(credentials.studentId, users.id))
            .where(eq(users.schoolId, schoolId))
        : db.select({ id: credentials.id, title: credentials.title, awardedAt: credentials.awardedAt }).from(credentials),
      schoolId
        ? db
            .select({
              id: submissions.id,
              assessmentId: submissions.assessmentId,
              submittedAt: submissions.submittedAt,
              gradedAt: submissions.gradedAt,
            })
            .from(submissions)
            .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
            .innerJoin(users, eq(assessments.createdBy, users.id))
            .where(eq(users.schoolId, schoolId))
        : db
            .select({
              id: submissions.id,
              assessmentId: submissions.assessmentId,
              submittedAt: submissions.submittedAt,
              gradedAt: submissions.gradedAt,
            })
            .from(submissions),
    ]);

    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const roleDistribution = {
      students: allUsers.filter((user) => user.role === UserRole.STUDENT).length,
      teachers: allUsers.filter((user) => user.role === UserRole.TEACHER).length,
      admins: allUsers.filter((user) => user.role === UserRole.ADMIN).length,
    };

    const gradeOrder = new Map<string, number>([
      ["K", 0],
      ["1", 1], ["2", 2], ["3", 3], ["4", 4], ["5", 5], ["6", 6],
      ["7", 7], ["8", 8], ["9", 9], ["10", 10], ["11", 11], ["12", 12],
    ]);
    const gradeCounts = new Map<string, number>();
    allUsers
      .filter((user) => user.role === UserRole.STUDENT)
      .forEach((user) => {
        const grade = (user.grade || "").trim();
        if (!grade) {
          return;
        }
        gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
      });
    const gradeDistribution = Array.from(gradeCounts.entries())
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => (gradeOrder.get(a.grade) ?? Number.MAX_SAFE_INTEGER) - (gradeOrder.get(b.grade) ?? Number.MAX_SAFE_INTEGER));

    const userGrowth = Array.from({ length: 6 }, (_, index) => {
      const monthOffset = 5 - index;
      const monthStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 1);

      const usersCount = allUsers.filter((user) => {
        const createdAt = this.toDate(user.createdAt);
        return createdAt ? this.isBefore(createdAt, nextMonthStart) : false;
      }).length;

      const projectsCount = allProjects.filter((project) => {
        const createdAt = this.toDate(project.createdAt);
        return createdAt ? this.isBefore(createdAt, nextMonthStart) : false;
      }).length;

      return {
        month: this.formatMonthLabel(monthStart),
        users: usersCount,
        projects: projectsCount,
      };
    });

    const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
      const dayOffset = 6 - index;
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
      const nextDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset + 1);

      const usersCreated = allUsers.filter((user) => {
        const createdAt = this.toDate(user.createdAt);
        return createdAt ? this.isSameOrAfter(createdAt, dayStart) && this.isBefore(createdAt, nextDayStart) : false;
      }).length;

      const submissionsCreated = allSubmissions.filter((submission) => {
        const submittedAt = this.toDate(submission.submittedAt);
        return submittedAt
          ? this.isSameOrAfter(submittedAt, dayStart) && this.isBefore(submittedAt, nextDayStart)
          : false;
      }).length;

      return {
        day: this.formatDayLabel(dayStart),
        users: usersCreated,
        submissions: submissionsCreated,
      };
    });

    const projectStatusDistribution = (["draft", "active", "completed", "archived"] as const).map((status) => ({
      status,
      count: allProjects.filter((project) => (project.status || "draft") === status).length,
    }));

    const submissionStatsByAssessment = new Map<number, { total: number; graded: number }>();
    allSubmissions.forEach((submission) => {
      if (!submission.assessmentId) {
        return;
      }
      const current = submissionStatsByAssessment.get(submission.assessmentId) || { total: 0, graded: 0 };
      current.total += 1;
      if (submission.gradedAt) {
        current.graded += 1;
      }
      submissionStatsByAssessment.set(submission.assessmentId, current);
    });

    const gradedAssessments = allAssessments.filter((assessment) => {
      const stats = submissionStatsByAssessment.get(assessment.id);
      return !!stats && stats.total > 0 && stats.total === stats.graded;
    }).length;

    const overdueProjects = allProjects.filter((project) => {
      const dueDate = this.toDate(project.dueDate);
      const status = project.status || "draft";
      return dueDate !== null && dueDate.getTime() < now.getTime() && status !== "completed" && status !== "archived";
    }).length;

    const ungradedSubmissions = allSubmissions.filter((submission) => !!submission.submittedAt && !submission.gradedAt).length;
    const draftProjects = allProjects.filter((project) => (project.status || "draft") === "draft").length;

    const recentActivities = [
      ...allUsers
        .filter((user) => this.toDate(user.createdAt))
        .map((user) => ({
          id: `user-${user.id}`,
          type: "user_created" as const,
          message: `New ${user.role} added: ${user.username}`,
          timestamp: (this.toDate(user.createdAt) as Date).toISOString(),
          severity: "info" as const,
        })),
      ...allProjects
        .filter((project) => this.toDate(project.createdAt))
        .map((project) => ({
          id: `project-${project.id}`,
          type: "project_created" as const,
          message: `Project created: ${project.title}`,
          timestamp: (this.toDate(project.createdAt) as Date).toISOString(),
          severity: "info" as const,
        })),
      ...allSubmissions
        .filter((submission) => this.toDate(submission.gradedAt))
        .map((submission) => ({
          id: `graded-submission-${submission.id}`,
          type: "submission_graded" as const,
          message: "Submission graded",
          timestamp: (this.toDate(submission.gradedAt) as Date).toISOString(),
          severity: "success" as const,
        })),
      ...allCredentials
        .filter((credential) => this.toDate(credential.awardedAt))
        .map((credential) => ({
          id: `credential-${credential.id}`,
          type: "credential_awarded" as const,
          message: `Credential awarded: ${credential.title}`,
          timestamp: (this.toDate(credential.awardedAt) as Date).toISOString(),
          severity: "success" as const,
        })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((user) => {
        return user.updatedAt ? new Date(user.updatedAt) > oneMonthAgo : false;
      }).length,
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter((project) => project.status === 'active').length,
      totalAssessments: allAssessments.length,
      gradedAssessments,
      totalCredentials: allCredentials.length,
      roleDistribution,
      gradeDistribution,
      userGrowth,
      weeklyActivity,
      projectStatusDistribution,
      needsAttention: {
        overdueProjects,
        ungradedSubmissions,
        draftProjects,
      },
      recentActivity: recentActivities,
    };
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

// Export a singleton instance
export const authStorage = new AuthStorage();
