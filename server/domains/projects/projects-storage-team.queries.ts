import {
  projectAssignments,
  projectTeamMembers,
  projectTeams,
  users,
  type InsertProjectTeam,
  type ProjectAssignment,
  type ProjectTeam,
  type ProjectTeamMember,
  type User,
} from "../../../shared/schema";
import { db } from "../../db";
import { and, asc, eq } from "drizzle-orm";

export class ProjectsTeamQueries {
  async createProjectTeam(teamData: InsertProjectTeam): Promise<ProjectTeam> {
    const [team] = await db.insert(projectTeams).values(teamData).returning();
    return team;
  }

  async getProjectTeams(projectId: number): Promise<ProjectTeam[]> {
    return db.select().from(projectTeams).where(eq(projectTeams.projectId, projectId));
  }

  async addTeamMember(memberData: Omit<ProjectTeamMember, "id" | "joinedAt">): Promise<ProjectTeamMember> {
    const [member] = await db.insert(projectTeamMembers).values(memberData).returning();
    return member;
  }

  async removeTeamMember(memberId: number): Promise<void> {
    await db.delete(projectTeamMembers).where(eq(projectTeamMembers.id, memberId));
  }

  async getTeamMembers(teamId: number): Promise<ProjectTeamMember[]> {
    return db
      .select({
        id: projectTeamMembers.id,
        teamId: projectTeamMembers.teamId,
        studentId: projectTeamMembers.studentId,
        role: projectTeamMembers.role,
        joinedAt: projectTeamMembers.joinedAt,
      })
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.teamId, teamId));
  }

  async getTeamMembersWithStudentInfo(
    teamId: number,
  ): Promise<
    Array<
      ProjectTeamMember & {
        studentName: string;
        student: {
          id: number;
          username: string;
        };
      }
    >
  > {
    const members = await db
      .select({
        id: projectTeamMembers.id,
        teamId: projectTeamMembers.teamId,
        studentId: projectTeamMembers.studentId,
        role: projectTeamMembers.role,
        joinedAt: projectTeamMembers.joinedAt,
        studentName: users.username,
        studentUsername: users.username,
      })
      .from(projectTeamMembers)
      .innerJoin(users, eq(projectTeamMembers.studentId, users.id))
      .where(eq(projectTeamMembers.teamId, teamId));

    return members.map((member) => ({
      id: member.id,
      teamId: member.teamId,
      studentId: member.studentId,
      role: member.role,
      joinedAt: member.joinedAt,
      studentName: member.studentName,
      student: {
        id: member.studentId,
        username: member.studentUsername,
      },
    }));
  }

  async getTeamMember(memberId: number): Promise<ProjectTeamMember | undefined> {
    const [member] = await db
      .select({
        id: projectTeamMembers.id,
        teamId: projectTeamMembers.teamId,
        studentId: projectTeamMembers.studentId,
        role: projectTeamMembers.role,
        joinedAt: projectTeamMembers.joinedAt,
      })
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.id, memberId));
    return member;
  }

  async getStudentsBySchool(schoolId: number): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "student")))
      .orderBy(asc(users.username));
  }

  async getProjectTeam(teamId: number): Promise<ProjectTeam | undefined> {
    const [team] = await db.select().from(projectTeams).where(eq(projectTeams.id, teamId));
    return team;
  }

  async deleteProjectTeam(teamId: number): Promise<void> {
    await db.delete(projectTeamMembers).where(eq(projectTeamMembers.teamId, teamId));
    await db.delete(projectTeams).where(eq(projectTeams.id, teamId));
  }

  async assignStudentToProject(projectId: number, studentId: number): Promise<ProjectAssignment> {
    const [assignment] = await db
      .insert(projectAssignments)
      .values({
        projectId,
        studentId,
        progress: "0",
      })
      .returning();
    return assignment;
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return db.select().from(projectAssignments).where(eq(projectAssignments.projectId, projectId));
  }

  async updateProjectProgress(projectId: number, studentId: number, progress: number): Promise<void> {
    await db
      .update(projectAssignments)
      .set({ progress: progress.toString() })
      .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.studentId, studentId)));
  }
}
