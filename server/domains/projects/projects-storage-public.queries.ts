import { projects, type Project } from "../../../shared/schema";
import { db } from "../../db";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import type { PublicProjectFilters } from "./projects.storage.types";

export class ProjectsPublicQueries {
  async getPublicProjects(filters?: PublicProjectFilters): Promise<Project[]> {
    const conditions = [eq(projects.isPublic, true)];

    if (filters?.search) {
      const searchCondition = sql`(
        ${projects.title} ILIKE ${`%${filters.search}%`}
        OR ${projects.description} ILIKE ${`%${filters.search}%`}
      )`;
      conditions.push(searchCondition);
    }

    if (filters?.subjectArea) {
      conditions.push(eq(projects.subjectArea, filters.subjectArea));
    }

    if (filters?.gradeLevel) {
      conditions.push(eq(projects.gradeLevel, filters.gradeLevel));
    }

    if (filters?.estimatedDuration) {
      conditions.push(eq(projects.estimatedDuration, filters.estimatedDuration));
    }

    const result = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));

    let filteredResults = result;
    if (filters?.componentSkillIds && filters.componentSkillIds.length > 0) {
      filteredResults = filteredResults.filter((project) => {
        const projectSkills = Array.isArray(project.componentSkillIds)
          ? (project.componentSkillIds as number[])
          : [];
        return filters.componentSkillIds!.some((skillId) => projectSkills.includes(skillId));
      });
    }

    if (filters?.bestStandardIds && filters.bestStandardIds.length > 0) {
      filteredResults = filteredResults.filter((project) => {
        const projectStandards = Array.isArray(project.bestStandardIds)
          ? (project.bestStandardIds as number[])
          : [];
        return filters.bestStandardIds!.some((standardId) => projectStandards.includes(standardId));
      });
    }

    return filteredResults;
  }

  async toggleProjectVisibility(projectId: number, isPublic: boolean): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ isPublic, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    return updatedProject;
  }
}
