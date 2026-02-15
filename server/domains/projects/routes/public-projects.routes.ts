import { Router } from "express";
import { wrapRoute, createSuccessResponse, sendErrorResponse } from "../../../utils/routeHelpers";
import type { ProjectsService } from "../projects.service";

export function registerPublicProjectRoutes(router: Router, projectsService: ProjectsService) {
  router.get('/public', wrapRoute(async (req, res) => {
    const { search, subjectArea, gradeLevel, estimatedDuration, componentSkillIds, bestStandardIds } = req.query;

    const filters: {
      search?: string;
      subjectArea?: string;
      gradeLevel?: string;
      estimatedDuration?: string;
      componentSkillIds?: number[];
      bestStandardIds?: number[];
    } = {};

    if (search && typeof search === 'string') filters.search = search;
    if (subjectArea && typeof subjectArea === 'string') filters.subjectArea = subjectArea;
    if (gradeLevel && typeof gradeLevel === 'string') filters.gradeLevel = gradeLevel;
    if (estimatedDuration && typeof estimatedDuration === 'string') filters.estimatedDuration = estimatedDuration;

    if (componentSkillIds) {
      const ids = typeof componentSkillIds === 'string' ? componentSkillIds.split(',') : componentSkillIds;
      filters.componentSkillIds = (ids as string[]).map((id) => parseInt(id)).filter((id) => !isNaN(id));
    }

    if (bestStandardIds) {
      const ids = typeof bestStandardIds === 'string' ? bestStandardIds.split(',') : bestStandardIds;
      filters.bestStandardIds = (ids as string[]).map((id) => parseInt(id)).filter((id) => !isNaN(id));
    }

    const projectsWithStandards = await projectsService.getPublicProjectsWithStandards(filters);
    createSuccessResponse(res, projectsWithStandards);
  }));

  router.get('/public-filters', wrapRoute(async (_req, res) => {
    const filters = await projectsService.getPublicFilters();
    createSuccessResponse(res, filters);
  }));

  router.get('/public/:id', wrapRoute(async (req, res) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return sendErrorResponse(res, { message: "Invalid project ID", statusCode: 400 });
    }

    try {
      const project = await projectsService.getPublicProjectDetails(projectId);
      createSuccessResponse(res, project);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Project not found")) {
        return sendErrorResponse(res, { message: error.message, statusCode: 404 });
      }
      if (error instanceof Error && error.message.includes("not publicly available")) {
        return sendErrorResponse(res, { message: error.message, statusCode: 403 });
      }
      throw error;
    }
  }));
}
