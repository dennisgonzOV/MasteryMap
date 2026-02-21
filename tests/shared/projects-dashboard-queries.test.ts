import { describe, expect, it } from "vitest";
import { mergeStudentProjectAssignments } from "../../server/domains/projects/projects-storage-dashboard.queries";

describe("projects dashboard queries", () => {
  it("merges direct and team assignments and de-duplicates by project id", () => {
    const assignments = [
      {
        projectId: 10,
        projectTitle: "Direct Assignment Project",
        projectDescription: "Assigned directly",
        projectStatus: "active",
        teacherUsername: "teacher1",
      },
      {
        projectId: 10,
        projectTitle: "Direct Assignment Project",
        projectDescription: "Assigned through team too",
        projectStatus: "active",
        teacherUsername: "teacher1",
      },
      {
        projectId: 22,
        projectTitle: "Team Assignment Project",
        projectDescription: "Assigned through team",
        projectStatus: "draft",
        teacherUsername: "teacher2",
      },
      {
        projectId: null,
        projectTitle: null,
        projectDescription: null,
        projectStatus: null,
        teacherUsername: null,
      },
    ];

    const merged = mergeStudentProjectAssignments(assignments);

    expect(merged).toHaveLength(2);
    expect(merged.map((assignment) => assignment.projectId)).toEqual([10, 22]);
    expect(merged[0].teacherName).toBe("teacher1");
    expect(merged[1].teacherName).toBe("teacher2");
  });
});
