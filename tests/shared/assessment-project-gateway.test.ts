import { describe, expect, it } from "vitest";
import { ProjectsAssessmentGateway } from "../../server/domains/assessments/assessment-project-gateway";
import type { Milestone, Project } from "../../shared/schema";

describe("assessment project gateway", () => {
  it("maps student projects to project ids", async () => {
    const gateway = new ProjectsAssessmentGateway({
      getMilestone: async () => undefined,
      getProject: async () => undefined,
      getProjectsByUser: async () => [
        { id: 11 } as unknown as Project,
        { id: 22 } as unknown as Project,
      ],
    });

    await expect(gateway.getStudentProjectIds(5)).resolves.toEqual([11, 22]);
  });

  it("passes through project and milestone reads", async () => {
    const milestone = { id: 9 } as unknown as Milestone;
    const project = { id: 4 } as unknown as Project;

    const gateway = new ProjectsAssessmentGateway({
      getMilestone: async (id) => (id === 9 ? milestone : undefined),
      getProject: async (id) => (id === 4 ? project : undefined),
      getProjectsByUser: async () => [],
    });

    await expect(gateway.getMilestone(9)).resolves.toBe(milestone);
    await expect(gateway.getProject(4)).resolves.toBe(project);
  });
});
