import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { 
  users as usersTable, 
  assessments as assessmentsTable,
  componentSkills as componentSkillsTable,
  safetyIncidents as safetyIncidentsTable,
  notifications as notificationsTable,
  projects as projectsTable,
  milestones as milestonesTable
} from "../../shared/schema";

interface SafetyIncident {
  studentId: number;
  teacherId?: number;
  assessmentId?: number;
  componentSkillId?: number;
  incidentType: 'homicidal_ideation' | 'suicidal_ideation' | 'inappropriate_language' | 'homicidal_ideation_fallback' | 'suicidal_ideation_fallback' | 'inappropriate_language_fallback';
  message: string;
  timestamp: Date;
  conversationHistory?: unknown[];
}

export async function notifyTeacherOfSafetyIncident(incident: SafetyIncident): Promise<void> {
  try {
    // Get student information
    const student = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      schoolId: usersTable.schoolId
    })
    .from(usersTable)
    .where(eq(usersTable.id, incident.studentId))
    .limit(1);

    if (!student.length) {
      console.error("Student not found for safety incident:", incident.studentId);
      return;
    }

    const studentInfo = student[0];

    let teachersToNotify: Array<{ id: number; username: string }> = [];

    // If this is related to a specific assessment, try to notify only the teacher who created it
    if (incident.assessmentId) {
      const assessment = await db.select({
        id: assessmentsTable.id,
        title: assessmentsTable.title,
        milestoneId: assessmentsTable.milestoneId
      })
      .from(assessmentsTable)
      .where(eq(assessmentsTable.id, incident.assessmentId))
      .limit(1);

      if (assessment.length && assessment[0].milestoneId) {
        // Get the project teacher through milestone -> project -> teacher
        const projectTeacher = await db.select({
          id: usersTable.id,
          username: usersTable.username
        })
        .from(usersTable)
        .innerJoin(projectsTable, eq(projectsTable.teacherId, usersTable.id))
        .innerJoin(milestonesTable, eq(milestonesTable.projectId, projectsTable.id))
        .where(eq(milestonesTable.id, assessment[0].milestoneId))
        .limit(1);

        if (projectTeacher.length) {
          teachersToNotify = projectTeacher;
        }
      }
    }

    // If no specific teacher found, fall back to all teachers in the school (for critical incidents)
    if (teachersToNotify.length === 0) {
      teachersToNotify = await db.select({
        id: usersTable.id,
        username: usersTable.username
      })
      .from(usersTable)
      .where(and(
        eq(usersTable.schoolId, studentInfo.schoolId!),
        eq(usersTable.role, 'teacher')
      ));
    }

    // Get assessment and component skill context if available
    let contextInfo = '';
    if (incident.assessmentId) {
      const assessment = await db.select()
        .from(assessmentsTable)
        .where(eq(assessmentsTable.id, incident.assessmentId))
        .limit(1);

      if (assessment.length) {
        contextInfo += `\nAssessment: ${assessment[0].title}`;
      }
    }

    if (incident.componentSkillId) {
      const componentSkill = await db.select()
        .from(componentSkillsTable)
        .where(eq(componentSkillsTable.id, incident.componentSkillId))
        .limit(1);

      if (componentSkill.length) {
        contextInfo += `\nComponent Skill: ${componentSkill[0].name}`;
      }
    }

    // Store the safety incident in the database
    await db.insert(safetyIncidentsTable).values({
      studentId: incident.studentId,
      teacherId: incident.teacherId,
      assessmentId: incident.assessmentId,
      componentSkillId: incident.componentSkillId,
      incidentType: incident.incidentType,
      message: incident.message,
      conversationHistory: incident.conversationHistory,
      severity: (incident.incidentType.includes('homicidal') || incident.incidentType.includes('suicidal')) ? 'critical' : 'high',
      resolved: false
    });

    // Create in-app notifications for the targeted teachers
    const notificationPromises = teachersToNotify.map(teacher => 
      db.insert(notificationsTable).values({
        userId: teacher.id,
        type: 'safety_incident',
        title: (incident.incidentType.includes('homicidal') || incident.incidentType.includes('suicidal'))
          ? 'URGENT: Safety Incident Reported'
          : 'Safety Incident: Inappropriate Language',
        message: `Student ${studentInfo.username} triggered a safety alert during AI chat interaction.${contextInfo}`,
        metadata: {
          studentId: incident.studentId,
          studentName: studentInfo.username,
          incidentType: incident.incidentType,
          severity: (incident.incidentType.includes('homicidal') || incident.incidentType.includes('suicidal')) ? 'critical' : 'high'
        },
        priority: (incident.incidentType.includes('homicidal') || incident.incidentType.includes('suicidal')) ? 'high' : 'medium',
        read: false
      })
    );

    await Promise.all(notificationPromises);

  } catch (error) {
    console.error("Error notifying teachers of safety incident:", error);
  }
}

export async function getTeachersBySchool(schoolId: number) {
  return await db.select({
    id: usersTable.id,
    username: usersTable.username
  })
  .from(usersTable)
  .where(and(
    eq(usersTable.schoolId, schoolId),
    eq(usersTable.role, 'teacher')
  ));
}
