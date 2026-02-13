import { describe, expect, it } from "vitest";
import { canTeacherManageAssessment } from "../../server/domains/assessments/assessment-ownership";
import type { AssessmentProjectGateway } from "../../server/domains/assessments/assessment-project-gateway";
import type { Assessment, Milestone, Project } from "../../shared/schema";

function makeAssessment(overrides: Partial<Assessment>): Assessment {
  return {
    id: 1,
    title: "Assessment",
    description: null,
    milestoneId: null,
    dueDate: null,
    questions: [],
    rubricId: null,
    componentSkillIds: [],
    aiGenerated: false,
    assessmentType: "teacher",
    allowSelfEvaluation: false,
    shareCode: null,
    shareCodeExpiresAt: null,
    pdfUrl: null,
    createdBy: null,
    createdAt: null,
    ...overrides,
  };
}

describe("assessment ownership policy", () => {
  const passthroughGateway: AssessmentProjectGateway = {
    getMilestone: async () => undefined,
    getProject: async () => undefined,
    getStudentProjectIds: async () => [],
  };

  it("allows teacher who created the assessment", async () => {
    const assessment = makeAssessment({ createdBy: 101 });
    await expect(
      canTeacherManageAssessment(assessment, 101, passthroughGateway),
    ).resolves.toBe(true);
  });

  it("denies teacher who did not create the assessment", async () => {
    const assessment = makeAssessment({ createdBy: 101 });
    await expect(
      canTeacherManageAssessment(assessment, 202, passthroughGateway),
    ).resolves.toBe(false);
  });

  it("checks milestone project ownership when createdBy is not set", async () => {
    const gateway: AssessmentProjectGateway = {
      getMilestone: async () => ({ id: 50, projectId: 70 } as unknown as Milestone),
      getProject: async () => ({ id: 70, teacherId: 303 } as unknown as Project),
      getStudentProjectIds: async () => [],
    };
    const assessment = makeAssessment({ createdBy: null, milestoneId: 50 });

    await expect(
      canTeacherManageAssessment(assessment, 404, gateway),
    ).resolves.toBe(false);
    await expect(
      canTeacherManageAssessment(assessment, 303, gateway),
    ).resolves.toBe(true);
  });
});
