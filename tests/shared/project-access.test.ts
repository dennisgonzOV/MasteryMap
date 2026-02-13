import { describe, expect, it } from "vitest";
import { assertProjectId, assertTeacherProjectAccess } from "../../server/domains/projects/project-access";

describe("project access helpers", () => {
  it("allows teacher access to own project", () => {
    expect(() =>
      assertTeacherProjectAccess({ teacherId: 10 }, 10, "teacher"),
    ).not.toThrow();
  });

  it("denies teacher access to another teacher project", () => {
    expect(() =>
      assertTeacherProjectAccess({ teacherId: 10 }, 12, "teacher"),
    ).toThrow("Access denied");
  });

  it("allows non-teacher roles", () => {
    expect(() =>
      assertTeacherProjectAccess({ teacherId: 10 }, 12, "admin"),
    ).not.toThrow();
  });

  it("validates project id values", () => {
    expect(assertProjectId(5, "Milestone")).toBe(5);
    expect(() => assertProjectId(null, "Milestone")).toThrow("Milestone project ID is invalid");
  });
});
