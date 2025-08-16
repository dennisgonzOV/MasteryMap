import { asc, eq, inArray, like, or } from "drizzle-orm";
import { db } from "../../db";
import {
  competencies,
  componentSkills,
  bestStandards,
  learnerOutcomes,
  type Competency,
  type ComponentSkill,
  type BestStandard,
  type LearnerOutcome
} from "../../../shared/schema";

export interface ICompetencyStorage {
  getCompetencies(): Promise<Competency[]>;
  getComponentSkills(): Promise<ComponentSkill[]>;
  getComponentSkillsByCompetency(competencyId: number): Promise<ComponentSkill[]>;
  getBestStandards(): Promise<BestStandard[]>;
  getBestStandardsByCompetency(competencyId: number): Promise<BestStandard[]>;
  getBestStandardsBySubject(subject: string): Promise<BestStandard[]>;
  getBestStandardsByGrade(grade: string): Promise<BestStandard[]>;
  searchBestStandards(searchTerm: string): Promise<BestStandard[]>;

  // 3-Level Hierarchy operations
  getLearnerOutcomes(): Promise<LearnerOutcome[]>;
  getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>>;
  getCompetenciesByLearnerOutcome(learnerOutcomeId: number): Promise<Competency[]>;
  getComponentSkillsWithDetails(): Promise<any[]>;
  getComponentSkillsByIds(skillIds: number[]): Promise<any[]>;
}

export class CompetencyStorage implements ICompetencyStorage {
  async getCompetencies(): Promise<Competency[]> {
    return await db
      .select()
      .from(competencies)
      .orderBy(asc(competencies.name));
  }

  async getComponentSkills(): Promise<ComponentSkill[]> {
    return await db
      .select()
      .from(componentSkills)
      .orderBy(asc(componentSkills.name));
  }

  async getComponentSkillsByCompetency(competencyId: number): Promise<ComponentSkill[]> {
    return await db
      .select()
      .from(componentSkills)
      .where(eq(componentSkills.competencyId, competencyId))
      .orderBy(asc(componentSkills.name));
  }

  async getBestStandards(): Promise<BestStandard[]> {
    return await db
      .select()
      .from(bestStandards)
      .orderBy(asc(bestStandards.benchmarkNumber));
  }

  async getBestStandardsByCompetency(competencyId: number): Promise<BestStandard[]> {
    // Note: bestStandards table doesn't have a competencyId column
    // This method returns all best standards for now
    return await db
      .select()
      .from(bestStandards)
      .orderBy(asc(bestStandards.benchmarkNumber));
  }

  async getBestStandardsBySubject(subject: string): Promise<BestStandard[]> {
    return await db
      .select()
      .from(bestStandards)
      .where(eq(bestStandards.subject, subject))
      .orderBy(asc(bestStandards.benchmarkNumber));
  }

  async getBestStandardsByGrade(grade: string): Promise<BestStandard[]> {
    return await db
      .select()
      .from(bestStandards)
      .where(eq(bestStandards.grade, grade))
      .orderBy(asc(bestStandards.benchmarkNumber));
  }

  async searchBestStandards(searchTerm: string): Promise<BestStandard[]> {
    return await db
      .select()
      .from(bestStandards)
      .where(or(
        like(bestStandards.description, `%${searchTerm}%`),
        like(bestStandards.benchmarkNumber, `%${searchTerm}%`),
        like(bestStandards.subject, `%${searchTerm}%`)
      ))
      .orderBy(asc(bestStandards.benchmarkNumber));
  }

  // 3-Level Hierarchy operations
  async getLearnerOutcomes(): Promise<LearnerOutcome[]> {
    return await db.select().from(learnerOutcomes).orderBy(learnerOutcomes.name);
  }

  async getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>> {
    const outcomes = await db.select().from(learnerOutcomes).orderBy(learnerOutcomes.name);
    console.log('Storage - Found outcomes:', outcomes.length);

    const result = [];
    for (const outcome of outcomes) {
      const competenciesData = await db
        .select()
        .from(competencies)
        .where(eq(competencies.learnerOutcomeId, outcome.id))
        .orderBy(competencies.name);

      console.log(`Storage - Outcome "${outcome.name}" has ${competenciesData.length} competencies`);

      const competenciesWithSkills = [];
      for (const competency of competenciesData) {
        const skills = await db
          .select()
          .from(componentSkills)
          .where(eq(componentSkills.competencyId, competency.id))
          .orderBy(componentSkills.name);

        console.log(`Storage - Competency "${competency.name}" has ${skills.length} component skills`);

        competenciesWithSkills.push({
          ...competency,
          componentSkills: skills,
        });
      }

      result.push({
        ...outcome,
        competencies: competenciesWithSkills,
      });
    }

    console.log('Storage - Final result has', result.length, 'outcomes');
    return result;
  }

  async getCompetenciesByLearnerOutcome(learnerOutcomeId: number): Promise<Competency[]> {
    return await db
      .select()
      .from(competencies)
      .where(eq(competencies.learnerOutcomeId, learnerOutcomeId))
      .orderBy(competencies.name);
  }

  async getComponentSkillsWithDetails(): Promise<any[]> {
    try {
      // Get all data separately to avoid join issues
      const skills = await db.select().from(componentSkills).orderBy(componentSkills.id);

      if (!skills || skills.length === 0){
        console.log("No component skills found in database");
        return [];
      }

      const allCompetencies = await db.select().from(competencies);
      const allLearnerOutcomes = await db.select().from(learnerOutcomes);

      // Create lookup maps for efficient data matching
      const competencyMap = new Map(allCompetencies.map(c => [c.id, c]));
      const outcomeMap = new Map(allLearnerOutcomes.map(o => [o.id, o]));

      // Enrich skills with competency and learner outcome data
      const enrichedSkills = skills.map((skill) => {
        const competency = skill.competencyId ? competencyMap.get(skill.competencyId) : null;
        const learnerOutcome = competency?.learnerOutcomeId ? outcomeMap.get(competency.learnerOutcomeId) : null;

        return {
          id: skill.id,
          name: skill.name || 'Unknown Skill',
          competencyId: skill.competencyId || 0,
          competencyName: competency?.name || 'Unknown Competency',
          competencyCategory: competency?.category || null,
          learnerOutcomeId: competency?.learnerOutcomeId || null,
          learnerOutcomeName: learnerOutcome?.name || 'Unknown Learner Outcome'
        };
      });

      console.log(`Successfully enriched ${enrichedSkills.length} component skills`);
      return enrichedSkills.filter(skill => skill.id && skill.name !== 'Unknown Skill');
    } catch (error) {
      console.error("Error in getComponentSkillsWithDetails:", error);
      return [];
    }
  }

  async getComponentSkillsByIds(skillIds: number[]) {
    if (!skillIds || skillIds.length === 0) {
      return [];
    }

    try {
      // First get the component skills
      const skills = await db
        .select()
        .from(componentSkills)
        .where(inArray(componentSkills.id, skillIds));

      if (!skills || skills.length === 0) {
        return [];
      }

      // Then enrich each skill with competency and learner outcome data
      const enrichedSkills = await Promise.all(
        skills.map(async (skill) => {
          try {
            // Get competency data
            const competencyQuery = await db
              .select()
              .from(competencies)
              .where(eq(competencies.id, skill.competencyId || 0));
            const competency = competencyQuery[0];

            let learnerOutcome = null;
            if (competency?.learnerOutcomeId) {
              const [outcome] = await db
                .select()
                .from(learnerOutcomes)
                .where(eq(learnerOutcomes.id, competency.learnerOutcomeId));
              learnerOutcome = outcome;
            }

            return {
              id: skill.id,
              name: skill.name,
              rubricLevels: skill.rubricLevels,
              competencyId: skill.competencyId,
              competencyName: competency?.name || 'Unknown Competency',
              learnerOutcomeName: learnerOutcome?.name || 'Unknown Learner Outcome',
            };
          } catch (skillError) {
            console.error(`Error enriching skill ${skill.id}:`, skillError);
            return {
              id: skill.id,
              name: skill.name,
              rubricLevels: skill.rubricLevels,
              competencyId: skill.competencyId,
              competencyName: 'Unknown Competency',
              learnerOutcomeName: 'Unknown Learner Outcome',
            };
          }
        })
      );

      return enrichedSkills;
    } catch (error) {
      console.error("Error in getComponentSkillsByIds:", error);
      return [];
    }
  }
}

export const competencyStorage = new CompetencyStorage();