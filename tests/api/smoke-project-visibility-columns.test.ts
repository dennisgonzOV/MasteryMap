import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../helpers/test-app";
import { db } from "../../server/db";
import { schools } from "../../shared/schema";

describe("Project visibility smoke", () => {
  let app: any;
  let teacherCookie: string[] = [];

  beforeAll(async () => {
    app = await getTestApp();

    const schoolName = `Smoke School ${Date.now()}`;
    const [school] = await db.insert(schools).values({
      name: schoolName,
      address: "",
      city: "",
      state: "",
      zipCode: "",
    }).returning();

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        username: `smoke-teacher-${Date.now()}`,
        password: "Test123!",
        role: "teacher",
        firstName: "Smoke",
        lastName: "Teacher",
        email: `smoke-teacher-${Date.now()}@example.com`,
        schoolName,
        schoolId: school.id,
      });

    teacherCookie = registerResponse.headers["set-cookie"] || [];
  });

  it("creates project, fetches it, and toggles visibility without column errors", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .set("Cookie", teacherCookie)
      .send({
        title: "Smoke Visibility Project",
        description: "Smoke test for project visibility and columns",
        componentSkillIds: [44],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        learningOutcomes: ["Outcome A", "Outcome B"],
        requiredResources: ["Resource A"],
        ideaSnapshot: {
          overview: "Smoke snapshot",
          learningOutcomes: ["Outcome A", "Outcome B"],
          requiredResources: ["Resource A"],
        },
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.id).toBeTruthy();
    const projectId = createResponse.body.id as number;

    const firstGetResponse = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", teacherCookie);

    expect(firstGetResponse.status).toBe(200);
    expect(firstGetResponse.body.learningOutcomes).toEqual(["Outcome A", "Outcome B"]);
    expect(firstGetResponse.body.requiredResources).toEqual(["Resource A"]);
    expect(firstGetResponse.body.ideaSnapshot?.overview).toBe("Smoke snapshot");

    const makePublicResponse = await request(app)
      .patch(`/api/projects/${projectId}/visibility`)
      .set("Cookie", teacherCookie)
      .send({ isPublic: true });

    expect(makePublicResponse.status).toBe(200);
    expect(makePublicResponse.body.isPublic).toBe(true);

    const secondGetResponse = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", teacherCookie);

    expect(secondGetResponse.status).toBe(200);
    expect(secondGetResponse.body.isPublic).toBe(true);
    expect(secondGetResponse.body.learningOutcomes).toEqual(["Outcome A", "Outcome B"]);
    expect(secondGetResponse.body.requiredResources).toEqual(["Resource A"]);

    const updateResponse = await request(app)
      .put(`/api/projects/${projectId}`)
      .set("Cookie", teacherCookie)
      .send({
        learningOutcomes: ["Outcome C"],
        requiredResources: ["Resource B", "Resource C"],
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.learningOutcomes).toEqual(["Outcome C"]);
    expect(updateResponse.body.requiredResources).toEqual(["Resource B", "Resource C"]);

    const makePrivateResponse = await request(app)
      .patch(`/api/projects/${projectId}/visibility`)
      .set("Cookie", teacherCookie)
      .send({ isPublic: false });

    expect(makePrivateResponse.status).toBe(200);
    expect(makePrivateResponse.body.isPublic).toBe(false);
  });
});
