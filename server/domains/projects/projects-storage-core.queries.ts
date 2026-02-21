import {
  assessments,
  grades,
  milestones,
  portfolioArtifacts,
  projectAssignments,
  projectTeamMembers,
  projectTeams,
  projects,
  safetyIncidents,
  selfEvaluations,
  submissions,
  users,
  type InsertMilestone,
  type InsertProject,
  type Milestone,
  type Project,
  type User,
} from "../../../shared/schema";
import { db } from "../../db";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";

export class ProjectsCoreQueries {
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByTeacher(teacherId: number): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.teacherId, teacherId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsBySchool(schoolId: number): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.schoolId, schoolId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsByStudent(studentId: number): Promise<Project[]> {
    const directProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        teacherId: projects.teacherId,
        schoolId: projects.schoolId,
        componentSkillIds: projects.componentSkillIds,
        bestStandardIds: projects.bestStandardIds,
        status: projects.status,
        dueDate: projects.dueDate,
        thumbnailUrl: projects.thumbnailUrl,
        isPublic: projects.isPublic,
        subjectArea: projects.subjectArea,
        gradeLevel: projects.gradeLevel,
        estimatedDuration: projects.estimatedDuration,
        learningOutcomes: projects.learningOutcomes,
        requiredResources: projects.requiredResources,
        ideaSnapshot: projects.ideaSnapshot,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(and(eq(projectAssignments.studentId, studentId), ne(projects.status, "draft")));

    const teamProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        teacherId: projects.teacherId,
        schoolId: projects.schoolId,
        componentSkillIds: projects.componentSkillIds,
        bestStandardIds: projects.bestStandardIds,
        status: projects.status,
        dueDate: projects.dueDate,
        thumbnailUrl: projects.thumbnailUrl,
        isPublic: projects.isPublic,
        subjectArea: projects.subjectArea,
        gradeLevel: projects.gradeLevel,
        estimatedDuration: projects.estimatedDuration,
        learningOutcomes: projects.learningOutcomes,
        requiredResources: projects.requiredResources,
        ideaSnapshot: projects.ideaSnapshot,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectTeams, eq(projects.id, projectTeams.projectId))
      .innerJoin(projectTeamMembers, eq(projectTeams.id, projectTeamMembers.teamId))
      .where(and(eq(projectTeamMembers.studentId, studentId), ne(projects.status, "draft")));

    const allProjects = [...directProjects, ...teamProjects];
    const uniqueProjects = Array.from(new Map(allProjects.map((project) => [project.id, project])).values());

    return uniqueProjects.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const processedUpdates = { ...updates };
    if (processedUpdates.dueDate && typeof processedUpdates.dueDate === "string") {
      processedUpdates.dueDate = new Date(processedUpdates.dueDate);
    }

    const [updatedProject] = await db
      .update(projects)
      .set(processedUpdates)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    const projectMilestones = await db.select({ id: milestones.id }).from(milestones).where(eq(milestones.projectId, id));
    const milestoneIds = projectMilestones.map((m) => m.id);

    if (milestoneIds.length > 0) {
      const milestoneAssessments = await db
        .select({ id: assessments.id })
        .from(assessments)
        .where(inArray(assessments.milestoneId, milestoneIds));

      const assessmentIds = milestoneAssessments.map((a) => a.id);

      if (assessmentIds.length > 0) {
        const assessmentSubmissions = await db
          .select({ id: submissions.id })
          .from(submissions)
          .where(inArray(submissions.assessmentId, assessmentIds));

        const submissionIds = assessmentSubmissions.map((s) => s.id);

        if (submissionIds.length > 0) {
          await db.delete(grades).where(inArray(grades.submissionId, submissionIds));
          await db.delete(portfolioArtifacts).where(inArray(portfolioArtifacts.submissionId, submissionIds));
          await db.delete(submissions).where(inArray(submissions.id, submissionIds));
        }

        await db.delete(selfEvaluations).where(inArray(selfEvaluations.assessmentId, assessmentIds));
        await db.delete(safetyIncidents).where(inArray(safetyIncidents.assessmentId, assessmentIds));
        await db.delete(assessments).where(inArray(assessments.id, assessmentIds));
      }

      await db.delete(portfolioArtifacts).where(inArray(portfolioArtifacts.milestoneId, milestoneIds));
      await db.delete(milestones).where(inArray(milestones.id, milestoneIds));
    }

    const teamIdsResult = await db
      .select({ id: projectTeams.id })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, id));

    if (teamIdsResult.length > 0) {
      const teamIdValues = teamIdsResult.map((team) => team.id);
      await db.delete(projectTeamMembers).where(inArray(projectTeamMembers.teamId, teamIdValues));
      await db.delete(projectTeams).where(eq(projectTeams.projectId, id));
    }

    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone;
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.order));
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone> {
    const processedUpdates = { ...updates };
    if (processedUpdates.dueDate && typeof processedUpdates.dueDate === "string") {
      processedUpdates.dueDate = new Date(processedUpdates.dueDate);
    }

    const [updatedMilestone] = await db
      .update(milestones)
      .set(processedUpdates)
      .where(eq(milestones.id, id))
      .returning();
    return updatedMilestone;
  }

  async deleteMilestone(id: number): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async incrementProjectGenerationCount(userId: number): Promise<User> {
    const now = new Date();

    const [updatedUser] = await db
      .update(users)
      .set({
        projectGenerationCount: sql`
          CASE 
            WHEN ${users.lastProjectGenerationDate} IS NOT NULL 
              AND EXTRACT(MONTH FROM ${users.lastProjectGenerationDate}) = EXTRACT(MONTH FROM NOW())
              AND EXTRACT(YEAR FROM ${users.lastProjectGenerationDate}) = EXTRACT(YEAR FROM NOW())
            THEN ${users.projectGenerationCount} + 1
            ELSE 1
          END
        `,
        lastProjectGenerationDate: now,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  }
}
