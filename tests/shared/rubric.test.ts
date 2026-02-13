import { describe, expect, it } from "vitest";
import { getRubricLevelColor, RUBRIC_LEVELS } from "@/lib/rubric";

describe("rubric helpers", () => {
  it("exposes all expected rubric levels in order", () => {
    expect(RUBRIC_LEVELS.map((level) => level.value)).toEqual([
      "emerging",
      "developing",
      "proficient",
      "applying",
    ]);
  });

  it("returns teacher palette styles by default", () => {
    expect(getRubricLevelColor("emerging")).toBe("bg-red-100 text-red-800 border-red-200");
  });

  it("returns student palette styles when requested", () => {
    expect(getRubricLevelColor("emerging", "student")).toBe("bg-orange-100 text-orange-800 border-orange-200");
  });

  it("returns fallback class for unknown values", () => {
    expect(getRubricLevelColor("unknown")).toBe("bg-gray-100 text-gray-800 border-gray-200");
  });
});
