import type { Project, Milestone } from "../../../shared/schema";
import { aiService } from "../ai/ai.service";
import { fluxImageService } from "../ai/flux.service";
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
}

export class ProjectsAIService {
  constructor(
    private readonly storage: IProjectsStorage,
    private readonly getAuthorizedProject: GetAuthorizedProject,
  ) {}

  async generateProjectIdeas(
    ideaParams: ProjectIdeaParams,
  ): Promise<{ ideas: Awaited<ReturnType<typeof aiService.generateProjectIdeas>> }> {
    const { subject, topic, gradeLevel, duration, componentSkillIds } = ideaParams;

    if (!Array.isArray(componentSkillIds) || !componentSkillIds.every((id) => typeof id === "number")) {
      throw new Error("Invalid component skill IDs format");
    }

    const componentSkills = await this.storage.getComponentSkillsByIds(componentSkillIds);
    const ideas = await aiService.generateProjectIdeas({
      subject: sanitizeForPrompt(subject),
      topic: sanitizeForPrompt(topic),
      gradeLevel: sanitizeForPrompt(gradeLevel),
      duration: sanitizeForPrompt(duration),
      componentSkills,
    });

    return { ideas };
  }

  async generateProjectIdeasForUser(
    userId: number,
    ideaParams: ProjectIdeaParams,
  ): Promise<{ ideas: Awaited<ReturnType<typeof aiService.generateProjectIdeas>> }> {
    const componentSkills = await this.storage.getComponentSkillsByIds(ideaParams.componentSkillIds);
    if (!componentSkills.length) {
      throw new Error("No valid component skills found for the provided IDs");
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
    const savedMilestones = await Promise.all(
      milestones.map((milestone, index) =>
        this.storage.createMilestone({
          projectId,
          title: milestone.title,
          description: milestone.description,
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
          order: index + 1,
          aiGenerated: true,
        }),
      ),
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

    const savedMilestones = await Promise.all(
      milestones.map(async (milestone, index) => {
        const savedMilestone = await this.storage.createMilestone({
          projectId,
          title: milestone.title,
          description: milestone.description,
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
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
