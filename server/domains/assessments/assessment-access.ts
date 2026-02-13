import type { Assessment, User } from "../../../shared/schema";
import type { AssessmentProjectGateway } from "./assessment-project-gateway";
import { canTeacherManageAssessment } from "./assessment-ownership";

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
    return canTeacherManageAssessment(assessment, user.id, projectGateway);
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
