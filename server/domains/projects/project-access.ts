import type { Project } from "../../../shared/schema";

export function assertTeacherProjectAccess(project: Pick<Project, "teacherId">, userId: number, userRole: string): void {
  if (userRole === "teacher" && project.teacherId !== userId) {
    throw new Error("Access denied");
  }
}

export function assertProjectId(value: number | null | undefined, entityLabel: string): number {
  if (!value) {
    throw new Error(`${entityLabel} project ID is invalid`);
  }
  return value;
}
