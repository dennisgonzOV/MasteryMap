import { describe, expect, it, vi } from "vitest";
import { createAssessmentsDomain } from "../../server/domains/assessments/composition";
import type { IAssessmentStorage } from "../../server/domains/assessments/assessments.storage";
import type { AssessmentProjectGateway } from "../../server/domains/assessments/assessment-project-gateway";
import type { AIService } from "../../server/domains/ai/ai.service";

describe("assessments composition", () => {
  it("builds a fully wired domain bundle with injectable dependencies", () => {
    const storage = {} as unknown as IAssessmentStorage;
    const projectGateway: AssessmentProjectGateway = {
      getMilestone: vi.fn(),
      getProject: vi.fn(),
      getStudentProjectIds: vi.fn(),
    };
    const ai = {} as unknown as AIService;

    const domain = createAssessmentsDomain({ storage, projectGateway, ai });

    expect(domain.service).toBeDefined();
    expect(domain.assessmentsRouter).toBeDefined();
    expect(domain.assessmentStudentRouter).toBeDefined();
    expect(domain.submissionsRouter).toBeDefined();
    expect(domain.selfEvaluationsRouter).toBeDefined();
  });
});
