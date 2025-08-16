import {
  projects,
  milestones,
  projectTeams,
  projectTeamMembers,
  projectAssignments,
  users,
  credentials,
  grades,
  submissions,
  type Project,
  type Milestone,
  type ProjectTeam,
  type ProjectTeamMember,
  type ProjectAssignment,
  type User,
  type InsertProject,
  type InsertMilestone,
  type InsertProjectTeam,
} from "../../../shared/schema";
import { db } from "../../db";
import { eq, and, desc, asc, ne, inArray, sql } from "drizzle-orm";
import { assessments } from "../../../shared/schema";
import { competencyStorage } from "../competencies/competencies.storage";

// Projects storage interface
export interface IProjectsStorage {
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByTeacher(teacherId: number): Promise<Project[]>;
  getProjectsByStudent(studentId: number): Promise<Project[]>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Milestone operations
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone>;
  deleteMilestone(id: number): Promise<void>;

  // Project team operations
  createProjectTeam(team: InsertProjectTeam): Promise<ProjectTeam>;
  getProjectTeams(projectId: number): Promise<ProjectTeam[]>;
  getProjectTeam(teamId: number): Promise<ProjectTeam | undefined>;
  deleteProjectTeam(teamId: number): Promise<void>;
  addTeamMember(teamMember: Omit<ProjectTeamMember, 'id' | 'joinedAt'>): Promise<ProjectTeamMember>;
  removeTeamMember(memberId: number): Promise<void>;
  getTeamMembers(teamId: number): Promise<ProjectTeamMember[]>;
  getStudentsBySchool(schoolId: number): Promise<User[]>;

  // Assignment operations
  assignStudentToProject(projectId: number, studentId: number): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  updateProjectProgress(projectId: number, studentId: number, progress: number): Promise<void>;

  // User operations
  getUser(id: number): Promise<User | undefined>;

  // Component skills operations
  getComponentSkillsByIds(ids: number[]): Promise<any[]>;
  getComponentSkillsWithDetails(): Promise<any[]>;

  // Assessment operations
  getAssessmentsByMilestone(milestoneId: number): Promise<any[]>;

  // Teacher dashboard operations
  getTeacherDashboardStats(teacherId: number): Promise<any>;
  getTeacherProjects(teacherId: number): Promise<any[]>;
  getTeacherPendingTasks(teacherId: number): Promise<any[]>;
  getTeacherCurrentMilestones(teacherId: number): Promise<any[]>;
  getSchoolStudentsProgress(teacherId: number): Promise<any[]>;
}

export class ProjectsStorage implements IProjectsStorage {
  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getProjectsByTeacher(teacherId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.teacherId, teacherId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsByStudent(studentId: number): Promise<Project[]> {
    // Get projects where student is a direct assignment
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
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(and(
        eq(projectAssignments.studentId, studentId),
        ne(projects.status, 'draft')
      ));

    // Get projects where student is a team member
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
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectTeams, eq(projects.id, projectTeams.projectId))
      .innerJoin(projectTeamMembers, eq(projectTeams.id, projectTeamMembers.teamId))
      .where(and(
        eq(projectTeamMembers.studentId, studentId),
        ne(projects.status, 'draft')
      ));

    // Combine and deduplicate projects
    const allProjects = [...directProjects, ...teamProjects];
    const uniqueProjects = Array.from(
      new Map(allProjects.map(project => [project.id, project])).values()
    );

    return uniqueProjects.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    // Handle date conversion if dueDate is provided as a string
    const processedUpdates = { ...updates };
    if (processedUpdates.dueDate && typeof processedUpdates.dueDate === 'string') {
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
    // Delete milestones first (due to foreign key constraints)
    await db.delete(milestones).where(eq(milestones.projectId, id));

    // Delete project teams and their members
    const teamIds = await db
      .select({ id: projectTeams.id })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, id));

    if (teamIds.length > 0) {
      const teamIdValues = teamIds.map(team => team.id);
      await db.delete(projectTeamMembers).where(inArray(projectTeamMembers.teamId, teamIdValues));
      await db.delete(projectTeams).where(eq(projectTeams.projectId, id));
    }

    // Delete project assignments
    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));

    // Finally, delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Milestone operations
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db
      .insert(milestones)
      .values(milestone)
      .returning();
    return newMilestone;
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    const [milestone] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id));
    return milestone;
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.order));
  }

  async updateMilestone(id: number, updates: Partial<InsertMilestone>): Promise<Milestone> {
    // Handle date conversion if dueDate is provided as a string
    const processedUpdates = { ...updates };
    if (processedUpdates.dueDate) {
      if (typeof processedUpdates.dueDate === 'string') {
        processedUpdates.dueDate = new Date(processedUpdates.dueDate);
      }
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

  // Project team operations
  async createProjectTeam(teamData: InsertProjectTeam): Promise<ProjectTeam> {
    const [team] = await db.insert(projectTeams).values(teamData).returning();
    return team;
  }

  async getProjectTeams(projectId: number): Promise<ProjectTeam[]> {
    return await db.select().from(projectTeams).where(eq(projectTeams.projectId, projectId));
  }

  async addTeamMember(memberData: Omit<ProjectTeamMember, 'id' | 'joinedAt'>): Promise<ProjectTeamMember> {
    const [member] = await db.insert(projectTeamMembers).values(memberData).returning();
    return member;
  }

  async removeTeamMember(memberId: number): Promise<void> {
    await db.delete(projectTeamMembers).where(eq(projectTeamMembers.id, memberId));
  }

  async getTeamMembers(teamId: number): Promise<ProjectTeamMember[]> {
    return await db.select({
      id: projectTeamMembers.id,
      teamId: projectTeamMembers.teamId,
      studentId: projectTeamMembers.studentId,
      role: projectTeamMembers.role,
      joinedAt: projectTeamMembers.joinedAt,
    }).from(projectTeamMembers)
    .where(eq(projectTeamMembers.teamId, teamId));
  }

  async getStudentsBySchool(schoolId: number): Promise<User[]> {
    return await db.select().from(users).where(and(
      eq(users.schoolId, schoolId),
      eq(users.role, 'student')
    )).orderBy(asc(users.firstName), asc(users.lastName));
  }





  async getProjectTeam(teamId: number): Promise<ProjectTeam | undefined> {
    const [team] = await db.select().from(projectTeams).where(eq(projectTeams.id, teamId));
    return team;
  }

  async deleteProjectTeam(teamId: number): Promise<void> {
    // First delete all team members
    await db.delete(projectTeamMembers).where(eq(projectTeamMembers.teamId, teamId));
    // Then delete the team
    await db.delete(projectTeams).where(eq(projectTeams.id, teamId));
  }

  // Assignment operations
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
    return await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId));
  }

  async updateProjectProgress(projectId: number, studentId: number, progress: number): Promise<void> {
    await db
      .update(projectAssignments)
      .set({ progress: progress.toString() })
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.studentId, studentId)
        )
      );
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  // Component skills operations
  async getComponentSkillsByIds(ids: number[]): Promise<any[]> {
    return await competencyStorage.getComponentSkillsByIds(ids);
  }

  async getComponentSkillsWithDetails(): Promise<any[]> {
    return await competencyStorage.getComponentSkillsWithDetails();
  }

  // Assessment operations
  async getAssessmentsByMilestone(milestoneId: number): Promise<any[]> {
    return await db.query.assessments.findMany({
      where: eq(assessments.milestoneId, milestoneId),
      with: {
        milestone: true
      }
    });
  }

  async getStudentCompetencyProgress(studentId: number): Promise<any[]> {
    // Get competency progress from grades (which contain the actual scores)
    return await db.select({
      componentSkillId: grades.componentSkillId,
      componentSkillName: sql<string>`'Component Skill'`, // This would need to be joined with componentSkills table
      averageScore: sql<number>`AVG(CAST(${grades.score} AS DECIMAL))`,
      submissionCount: sql<number>`COUNT(DISTINCT ${grades.submissionId})`
    })
      .from(grades)
      .innerJoin(submissions, eq(grades.submissionId, submissions.id))
      .where(eq(submissions.studentId, studentId))
      .groupBy(grades.componentSkillId);
  }

  // Teacher dashboard operations
  async getTeacherDashboardStats(teacherId: number): Promise<any> {
    // Get teacher's projects and related data
    const teacherProjects = await db.select()
      .from(projects)
      .where(eq(projects.teacherId, teacherId));

    const activeProjects = teacherProjects.filter(p => p.status === 'active').length;

    // Get total students assigned to teacher's projects
    const projectIds = teacherProjects.map(p => p.id);
    const studentAssignments = projectIds.length > 0 ? await db.select()
      .from(projectAssignments)
      .where(inArray(projectAssignments.projectId, projectIds)) : [];

    const totalStudents = new Set(studentAssignments.map(a => a.studentId)).size;

    // Get pending submissions for grading
    const pendingSubmissions = projectIds.length > 0 ? await db.select()
      .from(submissions)
      .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
      .innerJoin(milestones, eq(assessments.milestoneId, milestones.id))
      .where(and(
        inArray(milestones.projectId, projectIds),
        sql`${submissions.gradedAt} IS NULL`
      )) : [];

    // Get awarded credentials
    const credentialsAwarded = await db.select()
      .from(credentials)
      .where(eq(credentials.approvedBy, teacherId));

    return {
      activeProjects,
      totalStudents,
      pendingGrades: pendingSubmissions.length,
      credentialsAwarded: credentialsAwarded.length,
      upcomingDeadlines: 0 // Would need milestone deadline tracking
    };
  }

  async getTeacherProjects(teacherId: number): Promise<any[]> {
    const teacherProjects = await db.select()
      .from(projects)
      .where(eq(projects.teacherId, teacherId));

    // Get additional data for each project
    const projectOverviews = await Promise.all(
      teacherProjects.map(async (project) => {
        const assignments = await db.select()
          .from(projectAssignments)
          .where(eq(projectAssignments.projectId, project.id));

        const milestonesList = await db.select()
          .from(milestones)
          .where(eq(milestones.projectId, project.id))
          .orderBy(milestones.dueDate);

        const nextDeadline = milestonesList.find(m => m.dueDate && new Date(m.dueDate) > new Date())?.dueDate || null;

        return {
          id: project.id,
          title: project.title,
          description: project.description,
          studentsAssigned: assignments.length,
          completionRate: 0, // Would need submission tracking
          nextDeadline,
          status: project.status
        };
      })
    );

    return projectOverviews;
  }

  async getTeacherPendingTasks(teacherId: number): Promise<any[]> {
    // Get pending grading tasks
    const teacherProjects = await db.select()
      .from(projects)
      .where(eq(projects.teacherId, teacherId));

    const projectIds = teacherProjects.map(p => p.id);

    const pendingSubmissions = projectIds.length > 0 ? await db.select({
      submissionId: submissions.id,
      assessmentTitle: assessments.title,
      projectTitle: projects.title,
      firstName: users.firstName,
      lastName: users.lastName,
      submittedAt: submissions.submittedAt
    })
      .from(submissions)
      .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
      .innerJoin(milestones, eq(assessments.milestoneId, milestones.id))
      .innerJoin(projects, eq(milestones.projectId, projects.id))
      .innerJoin(users, eq(submissions.studentId, users.id))
      .where(and(
        inArray(milestones.projectId, projectIds),
        sql`${submissions.gradedAt} IS NULL`
      ))
      .limit(10) : [];

    const tasks = pendingSubmissions.map((submission, index) => ({
      id: submission.submissionId,
      type: 'grading' as const,
      title: "Grade " + submission.assessmentTitle,
      description: "Review submission for " + submission.firstName + " " + submission.lastName,
      priority: index < 3 ? 'high' as const : 'medium' as const,
      dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
      studentName: submission.firstName + " " + submission.lastName,
      projectTitle: submission.projectTitle
    }));

    return tasks;
  }

  async getTeacherCurrentMilestones(teacherId: number): Promise<any[]> {
    const teacherProjects = await db.select()
      .from(projects)
      .where(eq(projects.teacherId, teacherId));

    const projectIds = teacherProjects.map(p => p.id);

    const currentMilestones = projectIds.length > 0 ? await db.select()
      .from(milestones)
      .where(and(
        inArray(milestones.projectId, projectIds),
        sql`${milestones.dueDate} >= ${new Date().toISOString()}`)
      )
      .orderBy(milestones.dueDate)
      .limit(5) : [];

    const milestonesWithProgress = currentMilestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate,
      status: milestone.dueDate && new Date(milestone.dueDate) > new Date() ? 'not_started' as const : 'in_progress' as const,
      progress: Math.floor(Math.random() * 100) // Would need actual progress tracking
    }));

    return milestonesWithProgress;
  }

  async getSchoolStudentsProgress(teacherId: number): Promise<any[]> {
    // Get teacher's school ID
    const teacher = await db.select().from(users).where(eq(users.id, teacherId)).limit(1);
    if (!teacher.length || !teacher[0].schoolId) {
      throw new Error("Teacher school not found");
    }

    const schoolId = teacher[0].schoolId;

    // Get all students in the school
    const students = await db.select().from(users).where(and(
      eq(users.schoolId, schoolId),
      eq(users.role, 'student')
    )).orderBy(asc(users.firstName), asc(users.lastName));

    // Get detailed progress for each student
    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        try {
          // Get student's project assignments with project and teacher details
          const studentAssignments = await db.select({
            projectId: projectAssignments.projectId,
            projectTitle: projects.title,
            projectDescription: projects.description,
            projectStatus: projects.status,
            teacherFirstName: users.firstName,
            teacherLastName: users.lastName
          })
            .from(projectAssignments)
            .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
            .innerJoin(users, eq(projects.teacherId, users.id))
            .where(eq(projectAssignments.studentId, student.id));

          const processedAssignments = studentAssignments.map(assignment => ({
            projectId: assignment.projectId,
            projectTitle: assignment.projectTitle,
            projectDescription: assignment.projectDescription,
            projectStatus: assignment.projectStatus,
            teacherName: `${assignment.teacherFirstName} ${assignment.teacherLastName}`
          }));

          // Get student's credentials
          const studentCredentials = await db.select()
            .from(credentials)
            .where(eq(credentials.studentId, student.id))
            .orderBy(desc(credentials.awardedAt));

          // Get student's submissions and grades for competency progress
          const studentGrades = await db.select({
            componentSkillId: grades.componentSkillId,
            score: grades.score,
            gradedAt: grades.gradedAt
          })
            .from(grades)
            .innerJoin(submissions, eq(grades.submissionId, submissions.id))
            .where(eq(submissions.studentId, student.id));

          // Simplified competency progress calculation
          const competencyAverages = studentGrades.map(grade => {
            return {
              competencyId: 1, // Simplified for now
              competencyName: 'General Progress',
              componentSkillId: grade.componentSkillId,
              componentSkillName: `Component Skill ${grade.componentSkillId}`,
              averageScore: grade.score ? parseFloat(grade.score.toString()) : 0,
              submissionCount: 1
            };
          });

                      return {
              ...student,
              projects: processedAssignments,
            credentials: studentCredentials.map(cred => ({
              id: cred.id,
              title: cred.title,
              description: cred.description,
              type: cred.type,
              awardedAt: cred.awardedAt
            })),
            competencyProgress: competencyAverages,
            totalCredentials: studentCredentials.length,
            stickers: studentCredentials.filter(c => c.type === 'sticker').length,
            badges: studentCredentials.filter(c => c.type === 'badge').length,
            plaques: studentCredentials.filter(c => c.type === 'plaque').length
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
            plaques: 0
          };
        }
      })
    );

    return studentsWithProgress;
  }
}

// Export singleton instance
export const projectsStorage = new ProjectsStorage();