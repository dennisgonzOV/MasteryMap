import type { Project, Milestone } from "../../../shared/schema";
import { aiService, fluxImageService } from "../ai";
import { sanitizeForPrompt } from "../../middleware/security";
import type { IProjectsStorage } from "./projects.storage";

type GetAuthorizedProject = (
  projectId: number,
  userId: number,
  userRole: string,
) => Promise<Project>;

interface ProjectIdeaParams {
  subject: string;
  topic: string;
  gradeLevel: string;
  duration: string;
  componentSkillIds: number[];
  bestStandardIds?: number[];
}

export class ProjectsAIService {
  constructor(
    private readonly storage: IProjectsStorage,
    private readonly getAuthorizedProject: GetAuthorizedProject,
  ) {}

  private getStartOfTomorrow(): Date {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  private getProjectDueDateDay(project: Project): Date | null {
    if (!project.dueDate) {
      return null;
    }

    const projectDueDate = new Date(project.dueDate);
    if (Number.isNaN(projectDueDate.getTime())) {
      return null;
    }

    projectDueDate.setHours(0, 0, 0, 0);
    return projectDueDate;
  }

  private buildFallbackMilestoneDate(index: number, totalMilestones: number, projectDueDate: Date | null): Date {
    const tomorrow = this.getStartOfTomorrow();
    if (!projectDueDate) {
      const weeklyFallback = new Date(tomorrow);
      weeklyFallback.setDate(weeklyFallback.getDate() + (index + 1) * 7);
      return weeklyFallback;
    }

    const daysUntilProjectDue = Math.floor((projectDueDate.getTime() - tomorrow.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilProjectDue <= 1) {
      return tomorrow;
    }

    const stepDays = Math.max(1, Math.floor(daysUntilProjectDue / (totalMilestones + 1)));
    const fallback = new Date(tomorrow);
    fallback.setDate(fallback.getDate() + stepDays * (index + 1));
    if (fallback >= projectDueDate) {
      const dayBeforeDueDate = new Date(projectDueDate);
      dayBeforeDueDate.setDate(dayBeforeDueDate.getDate() - 1);
      fallback.setTime(dayBeforeDueDate.getTime());
    }
    return fallback;
  }

  private normalizeMilestoneDueDate(
    rawDueDate: string | Date | null | undefined,
    fallbackDate: Date,
    projectDueDate: Date | null,
  ): Date | null {
    const tomorrow = this.getStartOfTomorrow();
    const parsedDueDate = rawDueDate ? new Date(rawDueDate) : new Date(fallbackDate);
    const dueDate = Number.isNaN(parsedDueDate.getTime()) ? new Date(fallbackDate) : parsedDueDate;
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < tomorrow) {
      dueDate.setTime(fallbackDate.getTime());
      dueDate.setHours(0, 0, 0, 0);
    }

    if (!projectDueDate) {
      return dueDate;
    }

    if (dueDate >= projectDueDate) {
      const adjusted = new Date(projectDueDate);
      adjusted.setDate(adjusted.getDate() - 1);
      adjusted.setHours(0, 0, 0, 0);
      return adjusted >= tomorrow ? adjusted : null;
    }

    return dueDate;
  }

  async generateProjectIdeas(
    ideaParams: ProjectIdeaParams,
  ): Promise<{ ideas: Awaited<ReturnType<typeof aiService.generateProjectIdeas>> }> {
    const {
      subject,
      topic,
      gradeLevel,
      duration,
      componentSkillIds,
      bestStandardIds = [],
    } = ideaParams;

    if (!Array.isArray(componentSkillIds) || !componentSkillIds.every((id) => typeof id === "number")) {
      throw new Error("Invalid component skill IDs format");
    }
    if (!Array.isArray(bestStandardIds) || !bestStandardIds.every((id) => typeof id === "number")) {
      throw new Error("Invalid B.E.S.T. standard IDs format");
    }

    const componentSkills = componentSkillIds.length > 0
      ? await this.storage.getComponentSkillsByIds(componentSkillIds)
      : [];
    const bestStandards = bestStandardIds.length > 0
      ? await this.storage.getBestStandardsByIds(bestStandardIds)
      : [];

    if (componentSkills.length === 0 && bestStandards.length === 0) {
      throw new Error("No valid component skills or B.E.S.T. standards found for the provided IDs");
    }

    const ideas = await aiService.generateProjectIdeas({
      subject: sanitizeForPrompt(subject),
      topic: sanitizeForPrompt(topic),
      gradeLevel: sanitizeForPrompt(gradeLevel),
      duration: sanitizeForPrompt(duration),
      componentSkills,
      bestStandards,
    });

    return { ideas };
  }

  async generateProjectIdeasForUser(
    userId: number,
    ideaParams: ProjectIdeaParams,
  ): Promise<{ ideas: Awaited<ReturnType<typeof aiService.generateProjectIdeas>> }> {
    const componentSkills = ideaParams.componentSkillIds.length > 0
      ? await this.storage.getComponentSkillsByIds(ideaParams.componentSkillIds)
      : [];
    const bestStandards = (ideaParams.bestStandardIds?.length ?? 0) > 0
      ? await this.storage.getBestStandardsByIds(ideaParams.bestStandardIds ?? [])
      : [];
    if (componentSkills.length === 0 && bestStandards.length === 0) {
      throw new Error("No valid component skills or B.E.S.T. standards found for the provided IDs");
    }

    const user = await this.storage.getUser(userId);
    if (user?.tier === "free") {
      const now = new Date();
      const lastDate = user.lastProjectGenerationDate;
      let currentCount = user.projectGenerationCount || 0;

      if (lastDate) {
        const lastMonth = lastDate.getMonth();
        const lastYear = lastDate.getFullYear();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (lastMonth !== currentMonth || lastYear !== currentYear) {
          currentCount = 0;
        }
      }

      if (currentCount >= 5) {
        throw new Error("Free tier limit reached. You can generate up to 5 project ideas per month.");
      }

      await this.storage.incrementProjectGenerationCount(userId);
    }

    return this.generateProjectIdeas(ideaParams);
  }

  async generateProjectThumbnail(
    projectId: number,
    userId: number,
    userRole: string,
    options: { subject?: string; topic?: string },
  ): Promise<{ thumbnailUrl: string; project: Project }> {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);

    const thumbnailUrl = await fluxImageService.generateThumbnail({
      projectTitle: project.title,
      projectDescription: project.description || "",
      subject: options.subject,
      topic: options.topic,
    });

    if (!thumbnailUrl) {
      throw new Error("Failed to generate thumbnail");
    }

    const updatedProject = await this.storage.updateProject(projectId, { thumbnailUrl });
    return { thumbnailUrl, project: updatedProject };
  }

  async generateThumbnailPreview(options: {
    title: string;
    description?: string;
    subject?: string;
    topic?: string;
  }): Promise<{ thumbnailUrl: string }> {
    const thumbnailUrl = await fluxImageService.generateThumbnail({
      projectTitle: options.title,
      projectDescription: options.description || "",
      subject: options.subject,
      topic: options.topic,
    });

    if (!thumbnailUrl) {
      throw new Error("Failed to generate thumbnail");
    }

    return { thumbnailUrl };
  }

  async generateMilestonesForProject(
    projectId: number,
    userId: number,
    userRole: string,
  ): Promise<Milestone[]> {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);

    const projectComponentSkillIds = project.componentSkillIds as number[] | null;
    if (!projectComponentSkillIds?.length) {
      throw new Error("Project has no component skills for milestone generation");
    }

    const milestones = await aiService.generateProjectMilestones(project);
    const projectDueDate = this.getProjectDueDateDay(project);
    const savedMilestones = await Promise.all(
      milestones.map((milestone, index) => {
        const fallbackDate = this.buildFallbackMilestoneDate(index, milestones.length, projectDueDate);
        const dueDate = this.normalizeMilestoneDueDate(milestone.dueDate, fallbackDate, projectDueDate);
        return this.storage.createMilestone({
          projectId,
          title: milestone.title,
          description: milestone.description,
          dueDate,
          order: index + 1,
          aiGenerated: true,
        });
      }),
    );

    return savedMilestones;
  }

  async generateMilestonesAndAssessmentsForProject(
    projectId: number,
    userId: number,
    userRole: string,
  ): Promise<Array<{ milestone: Milestone; assessment: Awaited<ReturnType<typeof aiService.generateAssessmentFromComponentSkills>> }>> {
    const project = await this.getAuthorizedProject(projectId, userId, userRole);

    const projectComponentSkillIds = project.componentSkillIds as number[] | null;
    if (!projectComponentSkillIds?.length) {
      throw new Error("Project has no component skills");
    }

    const componentSkillsDetails = await this.storage.getComponentSkillsWithDetails();
    const projectComponentSkills = componentSkillsDetails.filter((skill) =>
      projectComponentSkillIds.includes(skill.id),
    );

    if (projectComponentSkills.length === 0) {
      throw new Error("No matching component skills found");
    }

    const milestones = await aiService.generateMilestonesFromComponentSkills(
      project.title,
      project.description || "",
      project.dueDate ? project.dueDate.toISOString() : new Date().toISOString(),
      projectComponentSkills,
    );
    const projectDueDate = this.getProjectDueDateDay(project);

    const savedMilestones = await Promise.all(
      milestones.map(async (milestone, index) => {
        const fallbackDate = this.buildFallbackMilestoneDate(index, milestones.length, projectDueDate);
        const dueDate = this.normalizeMilestoneDueDate(milestone.dueDate, fallbackDate, projectDueDate);
        const savedMilestone = await this.storage.createMilestone({
          projectId,
          title: milestone.title,
          description: milestone.description,
          dueDate,
          order: index + 1,
          aiGenerated: true,
        });

        const assessment = await aiService.generateAssessmentFromComponentSkills(
          savedMilestone.title,
          savedMilestone.description || "",
          savedMilestone.dueDate ? savedMilestone.dueDate.toISOString() : new Date().toISOString(),
          projectComponentSkills,
        );

        return {
          milestone: savedMilestone,
          assessment,
        };
      }),
    );

    return savedMilestones;
  }
}
