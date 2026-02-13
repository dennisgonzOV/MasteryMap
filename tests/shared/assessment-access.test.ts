import { describe, expect, it } from "vitest";
import { canUserAccessAssessment } from "../../server/domains/assessments/assessment-access";
import type { AssessmentProjectGateway } from "../../server/domains/assessments/assessment-project-gateway";
import type { Assessment, Milestone, Project, User } from "../../shared/schema";

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

function makeUser(overrides: Partial<User>): User {
  return {
    id: 1,
    username: "user",
    password: "x",
    firstName: null,
    lastName: null,
    email: null,
    schoolName: null,
    profileImageUrl: null,
    role: "teacher",
    schoolId: null,
    tier: "free",
    projectGenerationCount: 0,
    lastProjectGenerationDate: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("assessment access policy", () => {
  it("denies free-tier admin from accessing another user's assessment", async () => {
    const gateway: AssessmentProjectGateway = {
      getMilestone: async () => ({ id: 10, projectId: 20 } as unknown as Milestone),
      getProject: async () => ({ id: 20, teacherId: 999 } as unknown as Project),
      getStudentProjectIds: async () => [],
    };
    const assessment = makeAssessment({ createdBy: null, milestoneId: 10 });
    const user = makeUser({ id: 100, role: "admin", tier: "free" });

    await expect(canUserAccessAssessment(assessment, user, gateway)).resolves.toBe(false);
  });

  it("allows enterprise admin to access assessment", async () => {
    const gateway: AssessmentProjectGateway = {
      getMilestone: async () => undefined,
      getProject: async () => undefined,
      getStudentProjectIds: async () => [],
    };
    const assessment = makeAssessment({ createdBy: 123 });
    const user = makeUser({ role: "admin", tier: "enterprise" });

    await expect(canUserAccessAssessment(assessment, user, gateway)).resolves.toBe(true);
  });

  it("allows free-tier student only when assessment milestone belongs to assigned project", async () => {
    const gateway: AssessmentProjectGateway = {
      getMilestone: async (id) => (id === 10 ? ({ id: 10, projectId: 20 } as unknown as Milestone) : undefined),
      getProject: async () => undefined,
      getStudentProjectIds: async () => [20],
    };
    const assessment = makeAssessment({ milestoneId: 10 });
    const user = makeUser({ id: 7, role: "student", tier: "free" });

    await expect(canUserAccessAssessment(assessment, user, gateway)).resolves.toBe(true);
  });

  it("denies free-tier student when assessment is outside assigned projects", async () => {
    const gateway: AssessmentProjectGateway = {
      getMilestone: async () => ({ id: 10, projectId: 999 } as unknown as Milestone),
      getProject: async () => undefined,
      getStudentProjectIds: async () => [20],
    };
    const assessment = makeAssessment({ milestoneId: 10 });
    const user = makeUser({ id: 7, role: "student", tier: "free" });

    await expect(canUserAccessAssessment(assessment, user, gateway)).resolves.toBe(false);
  });
});
