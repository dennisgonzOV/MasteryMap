import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerPublicProjectRoutes } from "../../server/domains/projects/routes/public-projects.routes";
import type { ProjectsService } from "../../server/domains/projects/projects.service";

function buildApp(service: Pick<ProjectsService, "getPublicProjectsWithStandards" | "getPublicFilters" | "getPublicProjectDetails">) {
  const app = express();
  const router = express.Router();

  registerPublicProjectRoutes(router, service as unknown as ProjectsService);
  app.use("/api/projects", router);

  return app;
}

describe("public project routes", () => {
  let getPublicProjectsWithStandards: ReturnType<typeof vi.fn>;
  let getPublicFilters: ReturnType<typeof vi.fn>;
  let getPublicProjectDetails: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getPublicProjectsWithStandards = vi.fn().mockResolvedValue([]);
    getPublicFilters = vi.fn().mockResolvedValue({
      subjectAreas: ["Science"],
      gradeLevels: ["9"],
      durations: ["1-2 weeks"],
      competencyFrameworks: [],
    });
    getPublicProjectDetails = vi.fn().mockResolvedValue({ id: 1, title: "Public project" });
  });

  it("allows unauthenticated reads for public project list", async () => {
    getPublicProjectsWithStandards.mockResolvedValue([{ id: 1, title: "Climate Action" }]);

    const app = buildApp({
      getPublicProjectsWithStandards,
      getPublicFilters,
      getPublicProjectDetails,
    });

    const response = await request(app).get("/api/projects/public");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, title: "Climate Action" }]);
    expect(getPublicProjectsWithStandards).toHaveBeenCalledWith({});
  });

  it("parses query filters before calling service", async () => {
    const app = buildApp({
      getPublicProjectsWithStandards,
      getPublicFilters,
      getPublicProjectDetails,
    });

    const response = await request(app)
      .get("/api/projects/public")
      .query({
        search: "climate",
        subjectArea: "Science",
        gradeLevel: "9",
        estimatedDuration: "1-2 weeks",
        componentSkillIds: "1,invalid,3",
        bestStandardIds: "10,11,NaN",
      });

    expect(response.status).toBe(200);
    expect(getPublicProjectsWithStandards).toHaveBeenCalledWith({
      search: "climate",
      subjectArea: "Science",
      gradeLevel: "9",
      estimatedDuration: "1-2 weeks",
      componentSkillIds: [1, 3],
      bestStandardIds: [10, 11],
    });
  });

  it("allows unauthenticated reads for public filter metadata", async () => {
    const app = buildApp({
      getPublicProjectsWithStandards,
      getPublicFilters,
      getPublicProjectDetails,
    });

    const response = await request(app).get("/api/projects/public-filters");

    expect(response.status).toBe(200);
    expect(response.body.subjectAreas).toEqual(["Science"]);
    expect(getPublicFilters).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid public project id", async () => {
    const app = buildApp({
      getPublicProjectsWithStandards,
      getPublicFilters,
      getPublicProjectDetails,
    });

    const response = await request(app).get("/api/projects/public/not-a-number");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid project ID");
    expect(getPublicProjectDetails).not.toHaveBeenCalled();
  });

  it("maps non-public project errors to 403", async () => {
    getPublicProjectDetails.mockRejectedValue(new Error("This project is not publicly available"));

    const app = buildApp({
      getPublicProjectsWithStandards,
      getPublicFilters,
      getPublicProjectDetails,
    });

    const response = await request(app).get("/api/projects/public/1");

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("not publicly available");
  });
});
