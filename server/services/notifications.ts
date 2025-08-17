import { db } from "../db";
import { eq } from "drizzle-orm";
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
  conversationHistory?: any[];
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

    let teachersToNotify: any[] = [];

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
          console.log(`Notifying specific teacher for assessment ${incident.assessmentId}:`, projectTeacher[0]);
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
      .where(eq(usersTable.schoolId, studentInfo.schoolId!))
      .where(eq(usersTable.role, 'teacher'));
      
      console.log(`Falling back to all school teachers (${teachersToNotify.length} teachers)`);
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

    // Log the incident for record keeping
    console.log("SAFETY INCIDENT NOTIFICATION:", {
      studentId: incident.studentId,
      studentName: studentInfo.username,
      incidentType: incident.incidentType,
      timestamp: incident.timestamp.toISOString(),
      teachersNotified: teachersToNotify.length,
      contextInfo
    });

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

    // Create a comprehensive log entry that can be monitored
    const incidentReport = {
      type: 'SAFETY_INCIDENT',
      severity: (incident.incidentType.includes('homicidal') || incident.incidentType.includes('suicidal')) ? 'CRITICAL' : 'HIGH',
      student: {
        id: studentInfo.id,
        name: studentInfo.username,
      },
      incident: {
        type: incident.incidentType,
        message: incident.message,
        timestamp: incident.timestamp.toISOString()
      },
      context: contextInfo,
      teachersNotified: teachersToNotify.map(t => ({
        id: t.id,
        name: t.username,
      })),
      actionTaken: 'Conversation terminated, teachers notified'
    };

    console.log("DETAILED SAFETY REPORT:", JSON.stringify(incidentReport, null, 2));

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
  .where(eq(usersTable.schoolId, schoolId))
  .where(eq(usersTable.role, 'teacher'));
}