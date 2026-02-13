import { describe, expect, it } from "vitest";
import { buildBestStandardsUrl } from "@/lib/standards";

describe("buildBestStandardsUrl", () => {
  it("returns base endpoint when filters are empty", () => {
    expect(buildBestStandardsUrl({})).toBe("/api/competencies/best-standards");
  });

  it("trims and encodes search filter", () => {
    expect(
      buildBestStandardsUrl({
        searchTerm: "  critical thinking  ",
      }),
    ).toBe("/api/competencies/best-standards?search=critical+thinking");
  });

  it("includes subject and grade when not all", () => {
    expect(
      buildBestStandardsUrl({
        subject: "Math",
        grade: "8",
      }),
    ).toBe("/api/competencies/best-standards?subject=Math&grade=8");
  });

  it("omits subject and grade when set to all", () => {
    expect(
      buildBestStandardsUrl({
        searchTerm: "fractions",
        subject: "all",
        grade: "all",
      }),
    ).toBe("/api/competencies/best-standards?search=fractions");
  });
});
