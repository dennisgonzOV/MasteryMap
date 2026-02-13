import type { ComponentSkillWithDetailsDTO } from "@shared/contracts/api";

export interface AssessmentWithComponentSkills {
  componentSkillIds?: number[] | string | null;
}

export interface CompetencyGroup {
  competencyName: string;
  competencyCategory: string | null;
  learnerOutcomeName: string | null;
  learnerOutcomeType: string | null;
  skills: ComponentSkillWithDetailsDTO[];
}

function parseSkillIds(componentSkillIds: AssessmentWithComponentSkills["componentSkillIds"]): number[] {
  if (Array.isArray(componentSkillIds)) {
    return componentSkillIds.filter((value): value is number => typeof value === "number");
  }

  if (typeof componentSkillIds === "string") {
    try {
      const parsed = JSON.parse(componentSkillIds);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is number => typeof value === "number")
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function getCompetencyInfo(
  assessment: AssessmentWithComponentSkills,
  componentSkillsDetails: ComponentSkillWithDetailsDTO[],
): CompetencyGroup[] {
  if (!componentSkillsDetails.length) {
    return [];
  }

  const skillIds = parseSkillIds(assessment.componentSkillIds);
  if (!skillIds.length) {
    return [];
  }

  const skills = componentSkillsDetails.filter((skill) => skillIds.includes(skill.id));
  const competencyGroups = skills.reduce<Record<number, CompetencyGroup>>((acc, skill) => {
    const key = skill.competencyId;
    if (key == null) {
      return acc;
    }

    if (!acc[key]) {
      acc[key] = {
        competencyName: skill.competencyName ?? skill.name,
        competencyCategory: skill.competencyCategory ?? null,
        learnerOutcomeName: skill.learnerOutcomeName ?? null,
        learnerOutcomeType: skill.learnerOutcomeType ?? null,
        skills: [],
      };
    }

    acc[key].skills.push(skill);
    return acc;
  }, {});

  return Object.values(competencyGroups);
}
