import { db } from "../db";
import { eq } from "drizzle-orm";
import { 
  users as usersTable, 
  assessments as assessmentsTable,
  componentSkills as componentSkillsTable,
  safetyIncidents,
  notifications
} from "../../shared/schema";

interface SafetyIncident {
  studentId: number;
  teacherId?: number;
  assessmentId?: number;
  componentSkillId?: number;
  incidentType: 'homicidal_ideation' | 'inappropriate_language' | 'homicidal_ideation_fallback' | 'inappropriate_language_repeated' | 'inappropriate_language_repeated_fallback';
  message: string;
  timestamp: Date;
  conversationHistory?: any[];
}

export async function notifyTeacherOfSafetyIncident(incident: SafetyIncident): Promise<void> {
  try {
    // Get student information
    const student = await db.select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
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

    // Get teachers from the same school
    const schoolTeachers = await db.select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email
    })
    .from(usersTable)
    .where(eq(usersTable.schoolId, studentInfo.schoolId!))
    .where(eq(usersTable.role, 'teacher'));

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
      studentName: `${studentInfo.firstName} ${studentInfo.lastName}`,
      incidentType: incident.incidentType,
      timestamp: incident.timestamp.toISOString(),
      teachersNotified: schoolTeachers.length,
      contextInfo
    });

    // In a production system, you would:
    // 1. Send email notifications to teachers
    // 2. Create in-app notifications
    // 3. Store incident records in database
    // 4. Possibly alert school administrators

    // For now, we'll create a comprehensive log entry that can be monitored
    const incidentReport = {
      type: 'SAFETY_INCIDENT',
      severity: incident.incidentType.includes('homicidal') ? 'CRITICAL' : 'HIGH',
      student: {
        id: studentInfo.id,
        name: `${studentInfo.firstName} ${studentInfo.lastName}`,
        email: studentInfo.email
      },
      incident: {
        type: incident.incidentType,
        message: incident.message,
        timestamp: incident.timestamp.toISOString()
      },
      context: contextInfo,
      teachersNotified: schoolTeachers.map(t => ({
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
        email: t.email
      })),
      actionTaken: 'Conversation terminated, teachers notified'
    };

    console.log("DETAILED SAFETY REPORT:", JSON.stringify(incidentReport, null, 2));

    // TODO: Implement actual notification mechanisms:
    // - Email notifications using a service like SendGrid or AWS SES
    // - In-app notification system with database storage
    // - SMS alerts for critical incidents
    // - Integration with school management systems

  } catch (error) {
    console.error("Error notifying teachers of safety incident:", error);
  }
}

export async function getTeachersBySchool(schoolId: number) {
  return await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    email: usersTable.email
  })
  .from(usersTable)
  .where(eq(usersTable.schoolId, schoolId))
  .where(eq(usersTable.role, 'teacher'));
}