import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authRouter, requireAuth, requireRole, type AuthenticatedRequest } from "./domains/auth";
import { 
  validateIntParam, 
  sanitizeForPrompt, 
  createErrorResponse,
  csrfProtection,
  aiLimiter
} from "./middleware/security";
import { 
  handleRouteError, 
  handleEntityNotFound, 
  handleAuthorizationError,
  createSuccessResponse,
  wrapRoute
} from "./utils/routeHelpers";
import { validateIdParam } from "./middleware/routeValidation";
import { checkProjectAccess } from "./middleware/resourceAccess";
import { 
  insertProjectSchema, 
  insertMilestoneSchema, 
  insertAssessmentSchema, 
  insertSubmissionSchema,
  insertCredentialSchema,
  insertPortfolioArtifactSchema,
  insertSelfEvaluationSchema,
  type User
} from "@shared/schema";
import { generateMilestones, generateAssessment, generateFeedback, generateFeedbackForQuestion, generateMilestonesFromComponentSkills, generateAssessmentFromComponentSkills, generateProjectIdeas, generateQuestionGrade, generateComponentSkillGrades } from "./openai";
import { generateSelfEvaluationFeedback, generateAssessmentQuestions, generateTutorResponse } from "./services/openai";
import { z } from "zod";
import { 
  users as usersTable, 
  projects as projectsTable, 
  milestones as milestonesTable, 
  assessments as assessmentsTable, 
  submissions as submissionsTable, 
  credentials as credentialsTable, 
  portfolioArtifacts as portfolioArtifactsTable,
  learnerOutcomes as learnerOutcomesTable,
  competencies as competenciesTable,
  projectTeamMembers,
  grades as gradesTable,
  selfEvaluations as selfEvaluationsTable,
  componentSkills as componentSkillsTable,
  bestStandards as bestStandardsTable,
  projectAssignments,
  projects,
  milestones,
  assessments,
  submissions,
  portfolioArtifacts,
  credentials,
  safetyIncidents as safetyIncidentsTable,
  notifications as notificationsTable,
} from "../shared/schema";
import { eq, and, desc, asc, isNull, inArray, ne, sql, gte, or } from "drizzle-orm";
import { db } from "./db";

// Define AuthRequest type if it's not globally available
type AuthRequest = AuthenticatedRequest;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth routes
  app.use('/api/auth', authRouter);
  
  // Setup projects domain routes
  const { projectsRouter, milestonesRouter, projectTeamsRouter, projectTeamMembersRouter } = await import('./domains/projects');
  app.use('/api/projects', projectsRouter);
  app.use('/api/project-teams', projectTeamsRouter);
  app.use('/api/project-team-members', projectTeamMembersRouter);

  // Student assessment submissions
  app.get("/api/student/assessment-submissions/:studentId", requireAuth, validateIntParam('studentId'), async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { role, id: userId } = req.user;

      // Only allow students to view their own submissions, or teachers/admins
      if (role === 'student' && userId !== studentId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const submissionResults = await db
        .select({
          id: submissions.id,
          assessmentId: submissions.assessmentId,
          assessmentTitle: assessments.title,
          assessmentDescription: assessments.description,
          questions: assessments.questions,
          responses: submissions.responses,
          submittedAt: submissions.submittedAt,
          feedback: submissions.feedback,
          projectTitle: projects.title,
          milestoneTitle: milestones.title,
        })
        .from(submissions)
        .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
        .leftJoin(milestones, eq(assessments.milestoneId, milestones.id))
        .leftJoin(projects, eq(milestones.projectId, projects.id))
        .where(eq(submissions.studentId, studentId))
        .orderBy(desc(submissions.submittedAt));

      // Get earned credentials for each submission
      const submissionsWithCredentials = await Promise.all(
        submissionResults.map(async (submission) => {
          // Get credentials earned for this specific assessment submission
          // First get grades for this submission to find associated component skills
          const submissionGrades = await db
            .select({
              componentSkillId: gradesTable.componentSkillId,
              gradedAt: gradesTable.gradedAt
            })
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          // Get credentials earned for component skills that were graded in this submission
          // and awarded around the time of grading (within 1 day)
          const earnedCredentials = [];
          if (submissionGrades.length > 0) {
            // Filter out null componentSkillIds to prevent database query failures
            const componentSkillIds = submissionGrades
              .map(g => g.componentSkillId)
              .filter((id): id is number => id !== null);
            const gradeDate = submissionGrades[0].gradedAt;

            if (gradeDate && componentSkillIds.length > 0) {
              const dayBefore = new Date(gradeDate.getTime() - 24 * 60 * 60 * 1000);
              const dayAfter = new Date(gradeDate.getTime() + 24 * 60 * 60 * 1000);

              const submissionCredentials = await db
                .select({
                  id: credentials.id,
                  title: credentials.title,
                  description: credentials.description,
                  type: credentials.type,
                  awardedAt: credentials.awardedAt,
                })
                .from(credentials)
                .where(and(
                  eq(credentials.studentId, studentId),
                  inArray(credentials.componentSkillId, componentSkillIds),
                  gte(credentials.awardedAt, dayBefore),
                  sql`${credentials.awardedAt} <= ${dayAfter}`
                ));

              earnedCredentials.push(...submissionCredentials);
            }
          }

          // Get grades for this submission
          const grades = await db
            .select()
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          // Determine if submission is graded (has grades)
          const isGraded = grades.length > 0;

          return {
            ...submission,
            earnedCredentials,
            status: isGraded ? 'graded' : (submission.submittedAt ? 'submitted' : 'draft'),
            questionGrades: grades.reduce((acc: any, grade) => {
              if (grade.componentSkillId !== null) {
                acc[grade.componentSkillId] = {
                  score: grade.score ? parseFloat(grade.score) : 0,
                  rubricLevel: grade.rubricLevel,
                  feedback: grade.feedback
                };
              }
              return acc;
            }, {}),
          };
        })
      );

      res.json(submissionsWithCredentials);
    } catch (error) {
      console.error("Error fetching student assessment submissions:", error);
      res.status(500).json({ error: "Failed to fetch assessment submissions" });
    }
  });






  // Start project
    try {
      const memberId = parseInt(req.params.id);
      await storage.removeTeamMember(memberId);
      res.json({ message: "Team member removed successfully" });
  // Assessment routes start here

  // Assessment routes - keeping all assessment-related functionality
  app.get('/api/assessments/standalone', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getProjectTeam(teamId);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Check if user owns the project this team belongs to
      const project = await storage.getProject(team.projectId!);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership: admins can delete any team, teachers can only delete teams from their own projects
      if (req.user?.role === 'teacher' && project.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied - you can only delete teams from your own projects" });
      }

      await storage.deleteProjectTeam(teamId);
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Get users from admin's school for password reset
  app.get("/api/admin/school-users", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const adminId = (req as AuthenticatedRequest).user!.id;

      // Get admin's school ID
      const admin = await db.select().from(usersTable).where(eq(usersTable.id, adminId)).limit(1);

      if (!admin.length || !admin[0].schoolId) {
        return res.status(400).json({ message: "Admin school not found" });
      }

      const schoolId = admin[0].schoolId;

      // Get all users from the same school (excluding the admin themselves)
      const schoolUsers = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.schoolId, schoolId),
        ne(usersTable.id, adminId)
      ));

      // Format the response to include only the fields we need
      const formattedUsers = schoolUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        // grade: user.grade || null, // Removed since grade doesn't exist on user
        schoolId: user.schoolId
      }));

      res.json(formattedUsers);
    } catch (error) {
      console.error('Error fetching school users:', error);
      res.status(500).json({ message: "Failed to fetch school users" });
    }
  });

  // Analytics endpoint for admin dashboard
  app.get("/api/analytics/dashboard", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get analytics data
      const [users, projects, assessments, studentCredentials] = await Promise.all([
        db.select().from(usersTable),
        db.select().from(projectsTable),
        db.select().from(assessmentsTable),
        db.select().from(credentialsTable)
      ]);

      const analyticsData = {
        totalUsers: users.length,
        activeUsers: users.filter(u => {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          return u.updatedAt ? new Date(u.updatedAt) > oneMonthAgo : false;
        }).length,
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalAssessments: assessments.length,
        gradedAssessments: assessments.length, // Simplified since totalPoints doesn't exist
        totalCredentials: studentCredentials.length,
        recentActivity: [], // Could be implemented with activity tracking
        userGrowth: [], // Would need historical data
        projectStats: [], // Would need completion tracking
        competencyProgress: [] // Would need progress tracking
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Teacher dashboard stats
  app.get("/api/teacher/dashboard-stats", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = (req as AuthenticatedRequest).user!.id;

      // Get teacher's projects and related data
      const teacherProjects = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId));

      const activeProjects = teacherProjects.filter(p => p.status === 'active').length;

      // Get total students assigned to teacher's projects
      const projectIds = teacherProjects.map(p => p.id);
      const studentAssignments = projectIds.length > 0 ? await db.select()
        .from(projectAssignments)
        .where(inArray(projectAssignments.projectId, projectIds)) : [];

      const totalStudents = new Set(studentAssignments.map(a => a.studentId)).size;

      // Get pending submissions for grading
      const pendingSubmissions = projectIds.length > 0 ? await db.select()
        .from(submissionsTable)
        .innerJoin(assessmentsTable, eq(submissionsTable.assessmentId, assessmentsTable.id))
        .innerJoin(milestonesTable, eq(assessmentsTable.milestoneId, milestonesTable.id))
        .where(and(
          inArray(milestonesTable.projectId, projectIds),
          isNull(submissionsTable.gradedAt)
        )) : [];

      // Get awarded credentials
      const credentialsAwarded = await db.select()
        .from(credentialsTable)
        .where(eq(credentialsTable.approvedBy, teacherId));

      const stats = {
        activeProjects,
        totalStudents,
        pendingGrades: pendingSubmissions.length,
        credentialsAwarded: credentialsAwarded.length,
        upcomingDeadlines: 0 // Would need milestone deadline tracking
      };

      res.json(stats);
    } catch (error) {
      console.error('Teacher dashboard stats error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Teacher projects overview
  app.get("/api/teacher/projects", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = (req as AuthenticatedRequest).user!.id;

      const teacherProjects = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId));

      // Get additional data for each project
      const projectOverviews = await Promise.all(
        teacherProjects.map(async (project) => {
          const assignments = await db.select()
            .from(projectAssignments)
            .where(eq(projectAssignments.projectId, project.id));

          const milestonesList = await db.select()
            .from(milestonesTable)
            .where(eq(milestonesTable.projectId, project.id))
            .orderBy(milestonesTable.dueDate);

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

      res.json(projectOverviews);
    } catch (error) {
      console.error('Teacher projects error:', error);
      res.status(500).json({ message: "Failed to fetch teacher projects" });
    }
  });

  // Teacher pending tasks
  app.get("/api/teacher/pending-tasks", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = (req as AuthenticatedRequest).user!.id;

      // Get pending grading tasks
      const teacherProjects = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId));

      const projectIds = teacherProjects.map(p => p.id);

      const pendingSubmissions = projectIds.length > 0 ? await db.select({
        submissionId: submissionsTable.id,
        assessmentTitle: assessmentsTable.title,
        projectTitle: projectsTable.title,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        submittedAt: submissionsTable.submittedAt
      })
        .from(submissionsTable)
        .innerJoin(assessmentsTable, eq(submissionsTable.assessmentId, assessmentsTable.id))
        .innerJoin(milestonesTable, eq(assessmentsTable.milestoneId, milestonesTable.id))
        .innerJoin(projectsTable, eq(milestonesTable.projectId, projectsTable.id))
        .innerJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
        .where(and(
          inArray(milestonesTable.projectId, projectIds),
          isNull(submissionsTable.gradedAt)
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

      res.json(tasks);
    } catch (error) {
      console.error('Teacher pending tasks error:', error);
      res.status(500).json({ message: "Failed to fetch pending tasks" });
    }
  });

  // Teacher current milestones
  app.get("/api/teacher/current-milestones", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacherId = (req as AuthenticatedRequest).user!.id;

      const teacherProjects = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.teacherId, teacherId));

      const projectIds = teacherProjects.map(p => p.id);

      const currentMilestones = projectIds.length > 0 ? await db.select()
        .from(milestonesTable)
        .where(and(
          inArray(milestonesTable.projectId, projectIds),
          sql`${milestonesTable.dueDate} >= ${new Date().toISOString()}`)
        )
        .orderBy(milestonesTable.dueDate)
        .limit(5) : [];

      const milestonesWithProgress = currentMilestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        dueDate: milestone.dueDate,
        status: milestone.dueDate && new Date(milestone.dueDate) > new Date() ? 'not_started' as const : 'in_progress' as const,
        progress: Math.floor(Math.random() * 100) // Would need actual progress tracking
      }));

      res.json(milestonesWithProgress);
    } catch (error) {
      console.error('Teacher current milestones error:', error);
      res.status(500).json({ message: "Failed to fetch current milestones" });
    }
  });

  // Get all students in teacher's school with progress
  app.get("/api/teacher/school-students-progress", requireAuth, async (req, res) => {
    try {
      if ((req as AuthenticatedRequest).user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacher = await db.select().from(usersTable).where(eq(usersTable.id, (req as AuthenticatedRequest).user!.id)).limit(1);
      if (!teacher.length || !teacher[0].schoolId) {
        return res.status(400).json({ message: "Teacher school not found" });
      }

      const schoolId = teacher[0].schoolId;

      // Get all students in the school using the same simple query as the Create Project Team modal
      const students = await storage.getStudentsBySchool(schoolId);

      // Get detailed progress for each student
      const studentsWithProgress = await Promise.all(
        students.map(async (student) => {
          try {
            // Get student's project assignments with project and teacher details
            const studentAssignments = await db.select({
              projectId: projectAssignments.projectId,
              projectTitle: projectsTable.title,
              projectDescription: projectsTable.description,
              projectStatus: projectsTable.status,
              teacherFirstName: usersTable.firstName,
              teacherLastName: usersTable.lastName
            })
              .from(projectAssignments)
              .innerJoin(projectsTable, eq(projectAssignments.projectId, projectsTable.id))
              .innerJoin(usersTable, eq(projectsTable.teacherId, usersTable.id))
              .where(eq(projectAssignments.studentId, student.id));

            const processedAssignments = studentAssignments.map(assignment => ({
              projectId: assignment.projectId,
              projectTitle: assignment.projectTitle,
              projectDescription: assignment.projectDescription,
              projectStatus: assignment.projectStatus,
              teacherName: `${assignment.teacherFirstName} ${assignment.teacherLastName}`
            }));

            console.log(`Student ${student.id} (${student.firstName} ${student.lastName}) has ${studentAssignments.length} project assignments:`, processedAssignments);

            // Get student's credentials
            const studentCredentials = await db.select()
              .from(credentialsTable)
              .where(eq(credentialsTable.studentId, student.id))
              .orderBy(desc(credentialsTable.awardedAt));

            // Get student's submissions and grades for competency progress
            const studentSubmissions = await db.select()
              .from(submissionsTable)
              .where(and(
                eq(submissionsTable.studentId, student.id),
                isNull(submissionsTable.grade) === false
              ));

            // Simplified competency progress calculation
            const competencyAverages = studentSubmissions.map(submission => {
              return {
                competencyId: 1, // Simplified for now
                competencyName: 'General Progress',
                componentSkillId: submission.assessmentId,
                componentSkillName: `Assessment ${submission.assessmentId}`,
                averageScore: submission.grade || 0,
                submissionCount: 1
              };
            });

            return {
              ...student,
              grade: student.grade || 'N/A', // Ensure grade is available
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
              grade: student.grade || 'N/A',
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

      res.json(studentsWithProgress);
    } catch (error) {
      console.error('School students progress error:', error);
      res.status(500).json({ message: "Failed to fetch school students progress" });
    }
  });

  // Student upcoming deadlines
  app.get("/api/deadlines/student", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      if (req.user.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const studentId = req.user.id;

      // Get student's assigned projects
      const assignments = await db.select()
        .from(projectAssignments)
        .where(eq(projectAssignments.studentId, studentId));

      const projectIds = assignments.map(a => a.projectId);

      const upcomingDeadlines = projectIds.length > 0
        ? await db.select({
        milestoneId: milestonesTable.id,
        title: milestonesTable.title,
        projectTitle: projectsTable.title,
        dueDate: milestonesTable.dueDate
      })
        .from(milestonesTable)
        .innerJoin(projectsTable, eq(milestonesTable.projectId, projectsTable.id))
        .where(and(
          inArray(milestonesTable.projectId, projectIds),
          gte(milestonesTable.dueDate, new Date()))
        )
        .orderBy(milestonesTable.dueDate)
        .limit(5) : [];

      const deadlines = upcomingDeadlines.map((deadline) => {
        const daysUntil = deadline.dueDate ? Math.ceil((new Date(deadline.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          id: deadline.milestoneId,
          title: deadline.title,
          project: deadline.projectTitle,
          dueDate: daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : "In " + daysUntil + " days",
          priority: daysUntil <= 1 ? 'high' as const : daysUntil <= 3 ? 'medium' as const : 'low' as const
        };
      });

      res.json(deadlines);
    } catch (error) {
      console.error('Student deadlines error:', error);
      res.status(500).json({ message: "Failed to fetch student deadlines" });
    }
  });

  // Student competency progress endpoint
  app.get('/api/students/competency-progress', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Students can only view their own progress
      if (req.user?.role !== 'student' && req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // For students, get their own progress. For teachers/admins, allow studentId query param
      let studentId = userId;
      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        const queryStudentId = req.query.studentId;
        if (queryStudentId) {
          studentId = parseInt(queryStudentId as string);
        }
      }

      const progress = await storage.getStudentCompetencyProgress(studentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching competency progress:", error);
      res.status(500).json({ message: "Failed to fetch competency progress" });
    }
  });

  // School-wide component skills performance tracker
  app.get("/api/teacher/school-component-skills-progress", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacher = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
      if (!teacher.length || !teacher[0].schoolId) {
        return res.status(400).json({ message: "Teacher school not found" });
      }

      const schoolId = teacher[0].schoolId;

      // Get all students in the school
      const schoolStudents = await storage.getStudentsBySchool(schoolId);
      const studentIds = schoolStudents.map(s => s.id);

      if (studentIds.length === 0) {
        return res.json([]);
      }

      // Use storage method to get component skills with details safely
      const componentSkills = await storage.getComponentSkillsWithDetails();

      if (!componentSkills || componentSkills.length === 0) {
        console.log("No component skills found in database");
        return res.json([]);
      }

      // Debug logging
      console.log('School ID:', schoolId);
      console.log('Student IDs:', studentIds);
      console.log('Valid student IDs count:', studentIds.filter(id => id != null && typeof id === 'number').length);

      // Get grades for students in this school by joining through submissions
      let grades = [];
      try {
        if (studentIds.length === 0) {
          console.log('No students found for school');
          grades = [];
        } else {
          // Build OR conditions for each student ID to avoid inArray issues
          const studentConditions = studentIds.map(id => eq(submissionsTable.studentId, id));
          console.log('Building query for student IDs:', studentIds);

          const gradesWithStudents = await db.select({
            id: gradesTable.id,
            submissionId: gradesTable.submissionId,
            componentSkillId: gradesTable.componentSkillId,
            score: gradesTable.score,
            rubricLevel: gradesTable.rubricLevel,
            feedback: gradesTable.feedback,
            gradedAt: gradesTable.gradedAt,
            studentId: submissionsTable.studentId
          })
          .from(gradesTable)
          .innerJoin(submissionsTable, eq(gradesTable.submissionId, submissionsTable.id))
          .where(or(...studentConditions));

          grades = gradesWithStudents;
        }
        console.log('Total grades found for school students:', grades.length);
        console.log('Sample grades:', grades.slice(0, 3));
      } catch (error) {
        console.error('Error fetching grades:', error);
        grades = [];
      }

      // Calculate performance statistics for each component skill
      const skillsProgress = componentSkills.map(skill => {
        const skillGrades = grades.filter(g => g.componentSkillId === skill.id);

        if (skillGrades.length === 0) {
          return {
            id: skill.id,
            name: skill.name,
            competencyId: skill.competencyId || 0,
            competencyName: skill.competencyName || 'Unknown Competency',
            learnerOutcomeName: skill.learnerOutcomeName || 'Unknown Learner Outcome',
            averageScore: 0,
            studentsAssessed: 0,
            totalStudents: studentIds.length,
            passRate: 0,
            strugglingStudents: 0,
            excellingStudents: 0,
            rubricDistribution: {
              emerging: 0,
              developing: 0,
              proficient: 0,
              applying: 0
            },
            trend: 'stable' as const,
            lastAssessmentDate: null
          };
        }

        // Calculate statistics
        const averageScore = skillGrades.reduce((sum, g) => sum + (g.score || 0), 0) / skillGrades.length;
        const studentsAssessed = new Set(skillGrades.map(g => g.studentId)).size;

        // Count rubric level distribution
        const rubricDistribution = {
          emerging: skillGrades.filter(g => g.rubricLevel === 'emerging').length,
          developing: skillGrades.filter(g => g.rubricLevel === 'developing').length,
          proficient: skillGrades.filter(g => g.rubricLevel === 'proficient').length,
          applying: skillGrades.filter(g => g.rubricLevel === 'applying').length
        };

        const passRate = skillGrades.length > 0 ? ((rubricDistribution.proficient + rubricDistribution.applying) / skillGrades.length) * 100 : 0;
        const strugglingStudents = rubricDistribution.emerging;
        const excellingStudents = rubricDistribution.applying;

        // Simple trend calculation (would need historical data for real trend)
        const trend = averageScore >= 3.0 ? 'improving' : averageScore <= 2.0 ? 'declining' : 'stable';

        // Find most recent assessment
        const lastAssessmentDate = skillGrades.reduce((latest, grade) => {
          const gradeDate = new Date(grade.gradedAt || '');
          return gradeDate > latest ? gradeDate : latest;
        }, new Date(0));

        return {
          id: skill.id,
          name: skill.name,
          competencyId: skill.competencyId || 0,
          competencyName: skill.competencyName || 'Unknown Competency',
          learnerOutcomeName: skill.learnerOutcomeName || 'Unknown Learner Outcome',
          averageScore,
          studentsAssessed,
          totalStudents: studentIds.length,
          passRate,
          strugglingStudents,
          excellingStudents,
          rubricDistribution,
          trend,
          lastAssessmentDate: lastAssessmentDate.getTime() > 0 ? lastAssessmentDate.toISOString() : null
        };
      });

      // Filter out skills with no assessments and sort by most struggling
      const assessedSkills = skillsProgress.filter(skill => skill.studentsAssessed > 0);

      res.json(assessedSkills);
    } catch (error) {
      console.error('School component skills progress error:', error);
      res.status(500).json({ message: "Failed to fetch school component skills progress" });
    }
  });

  // School-wide skills statistics
  app.get("/api/teacher/school-skills-stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied" });
      }

      const teacher = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
      if (!teacher.length || !teacher[0].schoolId) {
        return res.status(400).json({ message: "Teacher school not found" });
      }

      const schoolId = teacher[0].schoolId;

      // Get all students in the school
      const schoolStudents = await storage.getStudentsBySchool(schoolId);
      const studentIds = schoolStudents.map(s => s.id);

      if (studentIds.length === 0) {
        return res.json({
          totalSkillsAssessed: 0,
          averageSchoolScore: 0,
          skillsNeedingAttention: 0,
          excellentPerformance: 0,
          studentsAssessed: 0,
          totalStudents: 0
        });
      }

      // Get all grades and filter in memory for safety
      const allGrades = await db.select().from(gradesTable);

      // Filter grades for students in this school (via submission table)
      const submissionsForSchool = await db.select()
        .from(submissionsTable)
        .where(sql`${submissionsTable.studentId} IN (${studentIds.join(',')})`);
        
      const submissionIds = submissionsForSchool.map(s => s.id);
      const grades = allGrades.filter(grade => submissionIds.includes(grade.submissionId));

      if (grades.length === 0) {
        return res.json({
          totalSkillsAssessed: 0,
          averageSchoolScore: 0,
          skillsNeedingAttention: 0,
          excellentPerformance: 0,
          studentsAssessed: 0,
          totalStudents: studentIds.length
        });
      }

      // Calculate aggregate statistics
      const skillsAssessed = new Set(grades.map(g => g.componentSkillId));
      const studentsAssessed = new Set(submissionsForSchool.map(s => s.studentId));
      const averageSchoolScore = grades.reduce((sum, g) => sum + (g.score ? parseFloat(g.score) : 0), 0) / grades.length;

      // Group by component skill to find struggling and excelling skills
      const skillStats = new Map();
      grades.forEach(grade => {
        const skillId = grade.componentSkillId;
        if (!skillStats.has(skillId)) {
          skillStats.set(skillId, []);
        }
        skillStats.get(skillId).push(grade);
      });

      let skillsNeedingAttention = 0;
      let excellentPerformance = 0;

      skillStats.forEach(skillGrades => {
        const avgScore = skillGrades.reduce((sum: number, g: any) => sum + g.score, 0) / skillGrades.length;
        const strugglingCount = skillGrades.filter((g: any) => g.rubricLevel === 'emerging').length;
        const strugglingPercentage = (strugglingCount / skillGrades.length) * 100;

        if (strugglingPercentage > 30 || avgScore < 2.0) {
          skillsNeedingAttention++;
        }
        if (avgScore >= 3.5) {
          excellentPerformance++;
        }
      });

      res.json({
        totalSkillsAssessed: skillsAssessed.size,
        averageSchoolScore,
        skillsNeedingAttention,
        excellentPerformance,
        studentsAssessed: studentsAssessed.size,
        totalStudents: studentIds.length
      });
    } catch (error) {
      console.error('School skills stats error:', error);
      res.status(500).json({ message: "Failed to fetch school skills statistics" });
    }
  });

  // Add the new endpoint for student assessment submissions
  // Get student's assessment submissions with details
  app.get("/api/student/assessment-submissions/:studentId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the user can access this data (student accessing own data)
      if (req.user.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get all submissions for the student
      const submissionResults = await db
        .select({
          id: submissions.id,
          assessmentId: submissions.assessmentId,
          assessmentTitle: assessments.title,
          assessmentDescription: assessments.description,
          questions: assessments.questions,
          responses: submissions.responses,
          submittedAt: submissions.submittedAt,
          feedback: submissions.feedback,
          projectTitle: projects.title,
          milestoneTitle: milestones.title,
        })
        .from(submissions)
        .innerJoin(assessments, eq(submissions.assessmentId, assessments.id))
        .leftJoin(milestones, eq(assessments.milestoneId, milestones.id))
        .leftJoin(projects, eq(milestones.projectId, projects.id))
        .where(eq(submissions.studentId, studentId))
        .orderBy(desc(submissions.submittedAt));

      // Get earned credentials for each submission
      const submissionsWithCredentials = await Promise.all(
        submissionResults.map(async (submission) => {
          // Get credentials earned for this specific assessment submission
          // First get grades for this submission to find associated component skills
          const submissionGrades = await db
            .select({
              componentSkillId: gradesTable.componentSkillId,
              gradedAt: gradesTable.gradedAt
            })
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          // Get credentials earned for component skills that were graded in this submission
          // and awarded around the time of grading (within 1 day)
          const earnedCredentials = [];
          if (submissionGrades.length > 0) {
            // Filter out null componentSkillIds to prevent database query failures
            const componentSkillIds = submissionGrades
              .map(g => g.componentSkillId)
              .filter((id): id is number => id !== null);
            const gradeDate = submissionGrades[0].gradedAt;

            if (gradeDate && componentSkillIds.length > 0) {
              const dayBefore = new Date(gradeDate.getTime() - 24 * 60 * 60 * 1000);
              const dayAfter = new Date(gradeDate.getTime() + 24 * 60 * 60 * 1000);

              const submissionCredentials = await db
                .select({
                  id: credentials.id,
                  title: credentials.title,
                  description: credentials.description,
                  type: credentials.type,
                  awardedAt: credentials.awardedAt,
                })
                .from(credentials)
                .where(and(
                  eq(credentials.studentId, studentId),
                  inArray(credentials.componentSkillId, componentSkillIds),
                  gte(credentials.awardedAt, dayBefore),
                  sql`${credentials.awardedAt} <= ${dayAfter}`
                ));

              earnedCredentials.push(...submissionCredentials);
            }
          }

          // Get grades for this submission
          const grades = await db
            .select()
            .from(gradesTable)
            .where(eq(gradesTable.submissionId, submission.id));

          return {
            ...submission,
            earnedCredentials,
            questionGrades: grades.reduce((acc: any, grade) => {
              if (grade.componentSkillId !== null) {
                acc[grade.componentSkillId] = {
                  score: grade.score ? parseFloat(grade.score) : 0,
                  rubricLevel: grade.rubricLevel,
                  feedback: grade.feedback
                };
              }
              return acc;
            }, {}),
          };
        })
      );

      res.json(submissionsWithCredentials);
    } catch (error) {
      console.error("Error fetching student assessment submissions:", error);
      res.status(500).json({ error: "Failed to fetch assessment submissions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}