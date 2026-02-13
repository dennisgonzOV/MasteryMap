import {
  assessments,
  credentials,
  grades,
  milestones,
  projectAssignments,
  projects,
  submissions,
  users,
} from "../../../shared/schema";
import { db } from "../../db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  TeacherCurrentMilestoneDTO,
  TeacherDashboardStatsDTO,
  TeacherPendingTaskDTO,
  TeacherProjectOverviewDTO,
} from "../../../shared/contracts/api";
import type { SchoolStudentProgressRecord } from "./projects.storage.types";

export class ProjectsDashboardQueries {
  async getTeacherDashboardStats(teacherId: number): Promise<TeacherDashboardStatsDTO> {
    const teacherProjects = await db.select().from(projects).where(eq(projects.teacherId, teacherId));

    const activeProjects = teacherProjects.filter((p) => p.status === "active").length;

    const projectIds = teacherProjects.map((p) => p.id);
    const studentAssignments =
      projectIds.length > 0
        ? await db.select().from(projectAssignments).where(inArray(projectAssignments.projectId, projectIds))
        : [];

    const totalStudents = new Set(studentAssignments.map((a) => a.studentId)).size;

    const pendingSubmissions =
      projectIds.length > 0
        ? await db
            .select()
            .from(submissions)
            .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
            .innerJoin(milestones, eq(assessments.milestoneId, milestones.id))
            .where(and(inArray(milestones.projectId, projectIds), sql`${submissions.gradedAt} IS NULL`))
        : [];

    const credentialsAwarded = await db
      .select()
      .from(credentials)
      .where(eq(credentials.approvedBy, teacherId));

    return {
      activeProjects,
      totalStudents,
      pendingGrades: pendingSubmissions.length,
      credentialsAwarded: credentialsAwarded.length,
      upcomingDeadlines: 0,
    };
  }

  async getTeacherProjects(teacherId: number): Promise<TeacherProjectOverviewDTO[]> {
    const teacherProjects = await db.select().from(projects).where(eq(projects.teacherId, teacherId));

    const projectOverviews = await Promise.all(
      teacherProjects.map(async (project) => {
        const assignments = await db
          .select()
          .from(projectAssignments)
          .where(eq(projectAssignments.projectId, project.id));

        const milestonesList = await db
          .select()
          .from(milestones)
          .where(eq(milestones.projectId, project.id))
          .orderBy(milestones.dueDate);

        const nextDeadline =
          milestonesList.find((m) => m.dueDate && new Date(m.dueDate) > new Date())?.dueDate || null;

        return {
          id: project.id,
          title: project.title,
          description: project.description,
          studentsAssigned: assignments.length,
          completionRate: 0,
          nextDeadline,
          status: project.status,
        };
      }),
    );

    return projectOverviews;
  }

  async getTeacherPendingTasks(teacherId: number): Promise<TeacherPendingTaskDTO[]> {
    const teacherProjects = await db.select().from(projects).where(eq(projects.teacherId, teacherId));
    const projectIds = teacherProjects.map((p) => p.id);

    const pendingSubmissions =
      projectIds.length > 0
        ? await db
            .select({
              submissionId: submissions.id,
              assessmentTitle: assessments.title,
              projectTitle: projects.title,
              username: users.username,
              submittedAt: submissions.submittedAt,
            })
            .from(submissions)
            .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
            .innerJoin(milestones, eq(assessments.milestoneId, milestones.id))
            .innerJoin(projects, eq(milestones.projectId, projects.id))
            .innerJoin(users, eq(submissions.studentId, users.id))
            .where(and(inArray(milestones.projectId, projectIds), sql`${submissions.gradedAt} IS NULL`))
            .limit(10)
        : [];

    return pendingSubmissions.map((submission, index) => ({
      id: submission.submissionId,
      type: "grading" as const,
      title: `Grade ${submission.assessmentTitle}`,
      description: `Review submission for ${submission.username}`,
      priority: index < 3 ? ("high" as const) : ("medium" as const),
      dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
      studentName: submission.username,
      projectTitle: submission.projectTitle,
    }));
  }

  async getTeacherCurrentMilestones(teacherId: number): Promise<TeacherCurrentMilestoneDTO[]> {
    const teacherProjects = await db.select().from(projects).where(eq(projects.teacherId, teacherId));
    const projectIds = teacherProjects.map((p) => p.id);

    const currentMilestones =
      projectIds.length > 0
        ? await db
            .select()
            .from(milestones)
            .where(
              and(
                inArray(milestones.projectId, projectIds),
                sql`${milestones.dueDate} >= ${new Date().toISOString()}`,
              ),
            )
            .orderBy(milestones.dueDate)
            .limit(5)
        : [];

    return currentMilestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate,
      status:
        milestone.dueDate && new Date(milestone.dueDate) > new Date()
          ? ("not_started" as const)
          : ("in_progress" as const),
      progress: Math.floor(Math.random() * 100),
    }));
  }

  async getSchoolStudentsProgress(teacherId: number): Promise<SchoolStudentProgressRecord[]> {
    const teacher = await db.select().from(users).where(eq(users.id, teacherId)).limit(1);
    if (!teacher.length || !teacher[0].schoolId) {
      throw new Error("Teacher school not found");
    }

    const schoolId = teacher[0].schoolId;

    const students = await db
      .select()
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "student")))
      .orderBy(asc(users.username));

    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        try {
          const studentAssignments = await db
            .select({
              projectId: projectAssignments.projectId,
              projectTitle: projects.title,
              projectDescription: projects.description,
              projectStatus: projects.status,
              teacherUsername: users.username,
            })
            .from(projectAssignments)
            .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
            .innerJoin(users, eq(projects.teacherId, users.id))
            .where(eq(projectAssignments.studentId, student.id));

          const processedAssignments = studentAssignments.map((assignment) => ({
            projectId: assignment.projectId,
            projectTitle: assignment.projectTitle,
            projectDescription: assignment.projectDescription,
            projectStatus: assignment.projectStatus,
            teacherName: assignment.teacherUsername,
          }));

          const studentCredentials = await db
            .select()
            .from(credentials)
            .where(eq(credentials.studentId, student.id))
            .orderBy(desc(credentials.awardedAt));

          const studentGrades = await db
            .select({
              componentSkillId: grades.componentSkillId,
              score: grades.score,
              gradedAt: grades.gradedAt,
            })
            .from(grades)
            .innerJoin(submissions, eq(grades.submissionId, submissions.id))
            .where(eq(submissions.studentId, student.id));

          const competencyAverages = studentGrades.map((grade) => ({
            competencyId: 1,
            competencyName: "General Progress",
            componentSkillId: grade.componentSkillId,
            componentSkillName: `Component Skill ${grade.componentSkillId}`,
            averageScore: grade.score ? parseFloat(grade.score.toString()) : 0,
            submissionCount: 1,
          }));

          return {
            ...student,
            projects: processedAssignments,
            credentials: studentCredentials.map((cred) => ({
              id: cred.id,
              title: cred.title,
              description: cred.description,
              type: cred.type,
              awardedAt: cred.awardedAt,
            })),
            competencyProgress: competencyAverages,
            totalCredentials: studentCredentials.length,
            stickers: studentCredentials.filter((c) => c.type === "sticker").length,
            badges: studentCredentials.filter((c) => c.type === "badge").length,
            plaques: studentCredentials.filter((c) => c.type === "plaque").length,
          };
        } catch (studentError) {
          console.error(`Error processing student ${student.id}:`, studentError);
          return {
            ...student,
            projects: [],
            credentials: [],
            competencyProgress: [],
            totalCredentials: 0,
            stickers: 0,
            badges: 0,
            plaques: 0,
          };
        }
      }),
    );

    return studentsWithProgress;
  }
}
