import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectsAIService } from "../../server/domains/projects/projects-ai.service";
import { aiService } from "../../server/domains/ai/ai.service";
import { fluxImageService } from "../../server/domains/ai";
import type { IProjectsStorage } from "../../server/domains/projects/projects.storage";

function buildStorage(overrides: Partial<IProjectsStorage>): IProjectsStorage {
  return {
    createProject: vi.fn(),
    getProject: vi.fn(),
    getProjectsByTeacher: vi.fn(),
    getProjectsBySchool: vi.fn(),
    getProjectsByStudent: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    createMilestone: vi.fn(),
    getMilestone: vi.fn(),
    getMilestonesByProject: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    createProjectTeam: vi.fn(),
    getProjectTeams: vi.fn(),
    getProjectTeam: vi.fn(),
    deleteProjectTeam: vi.fn(),
    addTeamMember: vi.fn(),
    removeTeamMember: vi.fn(),
    getTeamMembers: vi.fn(),
    getTeamMembersWithStudentInfo: vi.fn(),
    getTeamMember: vi.fn(),
    getStudentsBySchool: vi.fn(),
    assignStudentToProject: vi.fn(),
    getProjectAssignments: vi.fn(),
    updateProjectProgress: vi.fn(),
    getUser: vi.fn(),
    getComponentSkillsByIds: vi.fn(),
    getComponentSkillsWithDetails: vi.fn(),
    getBestStandardsByIds: vi.fn(),
    getLearnerOutcomesWithCompetencies: vi.fn(),
    getAssessmentsByMilestone: vi.fn(),
    getTeacherDashboardStats: vi.fn(),
    getTeacherProjects: vi.fn(),
    getTeacherPendingTasks: vi.fn(),
    getTeacherCurrentMilestones: vi.fn(),
    getSchoolStudentsProgress: vi.fn(),
    getPublicProjects: vi.fn(),
    toggleProjectVisibility: vi.fn(),
    incrementProjectGenerationCount: vi.fn(),
    ...overrides,
  } as unknown as IProjectsStorage;
}

describe("projects AI service limits", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks free-tier users at 5 generations in the current month", async () => {
    const now = new Date();
    const storage = buildStorage({
      getComponentSkillsByIds: vi.fn().mockResolvedValue([{ id: 1, name: "Skill 1" }]),
      getUser: vi.fn().mockResolvedValue({
        id: 5,
        tier: "free",
        projectGenerationCount: 5,
        lastProjectGenerationDate: now,
      }),
      incrementProjectGenerationCount: vi.fn(),
    });

    const service = new ProjectsAIService(storage, vi.fn() as any);

    await expect(
      service.generateProjectIdeasForUser(5, {
        subject: "Science",
        topic: "Ecosystems",
        gradeLevel: "6",
        duration: "3-4 weeks",
        componentSkillIds: [1],
      }),
    ).rejects.toThrow("Free tier limit reached");
    expect(storage.incrementProjectGenerationCount).not.toHaveBeenCalled();
  });

  it("resets the limit when last generation was in a previous month", async () => {
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const storage = buildStorage({
      getComponentSkillsByIds: vi.fn().mockResolvedValue([{ id: 1, name: "Skill 1" }]),
      getUser: vi.fn().mockResolvedValue({
        id: 5,
        tier: "free",
        projectGenerationCount: 5,
        lastProjectGenerationDate: previousMonth,
      }),
      incrementProjectGenerationCount: vi.fn().mockResolvedValue({ id: 5 }),
    });
    vi.spyOn(aiService, "generateProjectIdeas").mockResolvedValue([
      {
        title: "Idea",
        description: "Desc",
        overview: "Overview",
        suggestedMilestones: [],
        assessmentSuggestions: [],
        requiredResources: [],
        learningOutcomes: [],
        competencyAlignment: [],
      },
    ] as any);

    const service = new ProjectsAIService(storage, vi.fn() as any);

    await expect(
      service.generateProjectIdeasForUser(5, {
        subject: "Science",
        topic: "Ecosystems",
        gradeLevel: "6",
        duration: "3-4 weeks",
        componentSkillIds: [1],
      }),
    ).resolves.toMatchObject({ ideas: expect.any(Array) });
    expect(storage.incrementProjectGenerationCount).toHaveBeenCalledWith(5);
  });

  it("does not increment monthly count for enterprise users", async () => {
    const storage = buildStorage({
      getComponentSkillsByIds: vi.fn().mockResolvedValue([{ id: 1, name: "Skill 1" }]),
      getUser: vi.fn().mockResolvedValue({
        id: 9,
        tier: "enterprise",
        projectGenerationCount: 999,
        lastProjectGenerationDate: new Date(),
      }),
      incrementProjectGenerationCount: vi.fn(),
    });
    vi.spyOn(aiService, "generateProjectIdeas").mockResolvedValue([
      {
        title: "Idea",
        description: "Desc",
        overview: "Overview",
        suggestedMilestones: [],
        assessmentSuggestions: [],
        requiredResources: [],
        learningOutcomes: [],
        competencyAlignment: [],
      },
    ] as any);

    const service = new ProjectsAIService(storage, vi.fn() as any);

    await expect(
      service.generateProjectIdeasForUser(9, {
        subject: "Math",
        topic: "Fractions",
        gradeLevel: "5",
        duration: "1-2 weeks",
        componentSkillIds: [1],
      }),
    ).resolves.toMatchObject({ ideas: expect.any(Array) });
    expect(storage.incrementProjectGenerationCount).not.toHaveBeenCalled();
  });

  it("persists generated thumbnail path to project record", async () => {
    const projectId = 42;
    const thumbnailPath = "/objects/masterymap/Thumbnails/test-thumbnail.png";

    const storage = buildStorage({
      updateProject: vi.fn().mockResolvedValue({
        id: projectId,
        title: "Ecosystem Project",
        description: "Investigate ecosystems",
        thumbnailUrl: thumbnailPath,
      }),
    });

    const authorizedProject = {
      id: projectId,
      title: "Ecosystem Project",
      description: "Investigate ecosystems",
    } as any;

    vi.spyOn(fluxImageService, "generateThumbnail").mockResolvedValue(thumbnailPath);

    const service = new ProjectsAIService(
      storage,
      vi.fn().mockResolvedValue(authorizedProject) as any,
    );

    const result = await service.generateProjectThumbnail(projectId, 7, "teacher", {
      subject: "Science",
      topic: "Ecosystems",
    });

    expect(fluxImageService.generateThumbnail).toHaveBeenCalledWith({
      projectTitle: authorizedProject.title,
      projectDescription: authorizedProject.description,
      subject: "Science",
      topic: "Ecosystems",
    });
    expect(storage.updateProject).toHaveBeenCalledWith(projectId, {
      thumbnailUrl: thumbnailPath,
    });
    expect(result.thumbnailUrl).toBe(thumbnailPath);
    expect(result.project.thumbnailUrl).toBe(thumbnailPath);
  });
});
