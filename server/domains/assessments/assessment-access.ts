import type { Assessment, User } from "../../../shared/schema";
import type { AssessmentProjectGateway } from "./assessment-project-gateway";
import { canTeacherManageAssessment } from "./assessment-ownership";

async function canTeacherViewAssessment(
  assessment: Assessment,
  teacher: User,
  projectGateway: AssessmentProjectGateway,
): Promise<boolean> {
  const canManage = await canTeacherManageAssessment(assessment, teacher.id, projectGateway);
  if (canManage) {
    return true;
  }

  if (!teacher.schoolId) {
    return false;
  }

  if (assessment.createdBy && projectGateway.getUser) {
    const creator = await projectGateway.getUser(assessment.createdBy);
    if (creator?.schoolId && creator.schoolId === teacher.schoolId) {
      return true;
    }
  }

  if (!assessment.milestoneId) {
    return false;
  }

  const milestone = await projectGateway.getMilestone(assessment.milestoneId);
  if (!milestone?.projectId) {
    return false;
  }

  const project = await projectGateway.getProject(milestone.projectId);
  if (!project) {
    return false;
  }

  if (project.schoolId && project.schoolId === teacher.schoolId) {
    return true;
  }

  if (project.teacherId && projectGateway.getUser) {
    const projectOwner = await projectGateway.getUser(project.teacherId);
    return Boolean(projectOwner?.schoolId && projectOwner.schoolId === teacher.schoolId);
  }

  return false;
}

export async function canUserAccessAssessment(
  assessment: Assessment,
  user: User,
  projectGateway: AssessmentProjectGateway,
): Promise<boolean> {
  if (user.tier === "free") {
    if (user.role === "teacher" || user.role === "admin") {
      return canTeacherManageAssessment(assessment, user.id, projectGateway);
    }

    if (user.role === "student") {
      if (!assessment.milestoneId) {
        return false;
      }

      const milestone = await projectGateway.getMilestone(assessment.milestoneId);
      if (!milestone?.projectId) {
        return false;
      }

      const studentProjectIds = await projectGateway.getStudentProjectIds(user.id);
      return studentProjectIds.includes(milestone.projectId);
    }

    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "teacher") {
    return canTeacherViewAssessment(assessment, user, projectGateway);
  }

  if (user.role === "student") {
    return true;
  }

  return false;
}

export async function filterAccessibleAssessments(
  assessments: Assessment[],
  user: User,
  projectGateway: AssessmentProjectGateway,
): Promise<Assessment[]> {
  if (user.role === "admin") {
    return assessments;
  }

  const accessResults = await Promise.all(
    assessments.map(async (assessment) => ({
      assessment,
      allowed: await canUserAccessAssessment(assessment, user, projectGateway),
    })),
  );

  return accessResults
    .filter((entry) => entry.allowed)
    .map((entry) => entry.assessment);
}
