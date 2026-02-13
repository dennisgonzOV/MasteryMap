import type { Assessment } from "../../../shared/schema";
import type { AssessmentProjectGateway } from "./assessment-project-gateway";

export async function canTeacherManageAssessment(
  assessment: Assessment,
  teacherId: number,
  projectGateway: AssessmentProjectGateway,
): Promise<boolean> {
  if (assessment.createdBy) {
    return assessment.createdBy === teacherId;
  }

  if (!assessment.milestoneId) {
    return false;
  }

  const milestone = await projectGateway.getMilestone(assessment.milestoneId);
  if (!milestone?.projectId) {
    return false;
  }

  const project = await projectGateway.getProject(milestone.projectId);
  if (!project?.teacherId) {
    return false;
  }

  return project.teacherId === teacherId;
}
