import { asc, eq, inArray, ilike, or, isNotNull, and, sql } from "drizzle-orm";
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
  getBestStandardsWithFilters(filters: { search?: string; subject?: string; grade?: string }): Promise<BestStandard[]>;
  getBestStandardsMetadata(): Promise<{ subjects: string[], grades: string[] }>;

  // 3-Level Hierarchy operations
  getLearnerOutcomes(): Promise<LearnerOutcome[]>;
  getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>>;
  getCompetenciesByLearnerOutcome(learnerOutcomeId: number): Promise<Competency[]>;
  getComponentSkillsWithDetails(): Promise<any[]>;
  getComponentSkillsByIds(skillIds: number[]): Promise<any[]>;
  getBestStandardsByIds(standardIds: number[]): Promise<BestStandard[]>;
  getCompetenciesWithSkills(): Promise<any[]>;
  getAllComponentSkills(): Promise<any[]>;
}

export class CompetencyStorage implements ICompetencyStorage {
  private normalizeText(value: string): string {
    return value.trim().toLowerCase();
  }

  private buildSubjectCondition(subject: string) {
    const normalized = this.normalizeText(subject);

    if (normalized === "english" || normalized === "english language arts" || normalized === "english language arts (b.e.s.t.)") {
      return sql`(
        lower(trim(coalesce(${bestStandards.subject}, ''))) in ('english', 'english language arts', 'english language arts (b.e.s.t.)')
        or ${bestStandards.benchmarkNumber} ilike 'ELA.%'
      )`;
    }

    if (normalized === "math" || normalized === "mathematics" || normalized === "mathematics (b.e.s.t.)") {
      return sql`(
        lower(trim(coalesce(${bestStandards.subject}, ''))) in ('math', 'mathematics', 'mathematics (b.e.s.t.)')
        or ${bestStandards.benchmarkNumber} ilike 'MA.%'
      )`;
    }

    if (normalized === "science") {
      return sql`(
        lower(trim(coalesce(${bestStandards.subject}, ''))) = 'science'
        or ${bestStandards.benchmarkNumber} ilike 'SC.%'
      )`;
    }

    if (normalized === "social studies") {
      return sql`(
        lower(trim(coalesce(${bestStandards.subject}, ''))) = 'social studies'
        or ${bestStandards.benchmarkNumber} ilike 'SS.%'
      )`;
    }

    return sql`lower(trim(coalesce(${bestStandards.subject}, ''))) = ${normalized}`;
  }

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
        ilike(bestStandards.description, `%${searchTerm}%`),
        ilike(bestStandards.benchmarkNumber, `%${searchTerm}%`),
        ilike(bestStandards.subject, `%${searchTerm}%`)
      ))
      .orderBy(asc(bestStandards.benchmarkNumber));
  }

  async getBestStandardsWithFilters(filters: {
    search?: string;
    subject?: string;
    grade?: string;
  }): Promise<BestStandard[]> {
    const conditions = [];

    // Add search condition
    if (filters.search && filters.search.trim()) {
      conditions.push(or(
        ilike(bestStandards.description, `%${filters.search.trim()}%`),
        ilike(bestStandards.benchmarkNumber, `%${filters.search.trim()}%`),
        ilike(bestStandards.subject, `%${filters.search.trim()}%`)
      ));
    }

    // Add subject condition
    if (filters.subject && filters.subject !== 'all') {
      conditions.push(this.buildSubjectCondition(filters.subject));
    }

    // Add grade condition
    if (filters.grade && filters.grade !== 'all') {
      conditions.push(eq(bestStandards.grade, filters.grade));
    }

    const baseQuery = db.select().from(bestStandards);
    const filteredQuery = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    return (await filteredQuery.orderBy(asc(bestStandards.benchmarkNumber))) as BestStandard[];
  }

  async getBestStandardsMetadata(): Promise<{ subjects: string[], grades: string[] }> {
    try {
      const subjectsResult = await db.execute(sql`
        select distinct
          case
            when ${bestStandards.benchmarkNumber} ilike 'ELA.%'
              or lower(trim(coalesce(${bestStandards.subject}, ''))) in ('english', 'english language arts', 'english language arts (b.e.s.t.)')
              then 'English'
            when ${bestStandards.benchmarkNumber} ilike 'MA.%'
              or lower(trim(coalesce(${bestStandards.subject}, ''))) in ('math', 'mathematics', 'mathematics (b.e.s.t.)')
              then 'Math'
            when ${bestStandards.benchmarkNumber} ilike 'SC.%'
              or lower(trim(coalesce(${bestStandards.subject}, ''))) = 'science'
              then 'Science'
            when ${bestStandards.benchmarkNumber} ilike 'SS.%'
              or lower(trim(coalesce(${bestStandards.subject}, ''))) = 'social studies'
              then 'Social Studies'
            else nullif(trim(${bestStandards.subject}), '')
          end as subject
        from ${bestStandards}
      `);

      const gradesResult = await db.execute(sql`
        select distinct nullif(trim(${bestStandards.grade}), '') as grade
        from ${bestStandards}
      `);

      const subjects = (subjectsResult.rows as Array<{ subject: string | null }>)
        .map((row) => row.subject)
        .filter((subject): subject is string => Boolean(subject))
        .sort((a, b) => a.localeCompare(b));

      const grades = (gradesResult.rows as Array<{ grade: string | null }>)
        .map((row) => row.grade)
        .filter((grade): grade is string => Boolean(grade))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      return {
        subjects,
        grades,
      };
    } catch (error) {
      console.error('Error fetching best standards metadata:', error);
      return { subjects: [], grades: [] };
    }
  }

  // 3-Level Hierarchy operations
  async getLearnerOutcomes(): Promise<LearnerOutcome[]> {
    return await db.select().from(learnerOutcomes).orderBy(learnerOutcomes.name);
  }

  async getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>> {
    const outcomes = await db.select().from(learnerOutcomes).orderBy(learnerOutcomes.name);

    const result = [];
    for (const outcome of outcomes) {
      const competenciesData = await db
        .select()
        .from(competencies)
        .where(eq(competencies.learnerOutcomeId, outcome.id))
        .orderBy(competencies.name);

      const competenciesWithSkills = [];
      for (const competency of competenciesData) {
        const skills = await db
          .select()
          .from(componentSkills)
          .where(eq(componentSkills.competencyId, competency.id))
          .orderBy(componentSkills.name);

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

      if (!skills || skills.length === 0) {
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
          competencyDescription: competency?.description || null,
          competencyCategory: competency?.category || null,
          learnerOutcomeId: competency?.learnerOutcomeId || null,
          learnerOutcomeName: learnerOutcome?.name || 'Unknown Learner Outcome',
          rubricLevels: skill.rubricLevels || null
        };
      });

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
              rubricLevels: (typeof skill.rubricLevels === 'object' && skill.rubricLevels !== null && !Array.isArray(skill.rubricLevels)) ? skill.rubricLevels : {},
              competencyId: skill.competencyId,
              competencyName: competency?.name || 'Unknown Competency',
              competencyDescription: competency?.description || null,
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
              competencyDescription: null,
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

  async getBestStandardsByIds(standardIds: number[]): Promise<BestStandard[]> {
    if (!standardIds || standardIds.length === 0) {
      return [];
    }

    try {
      return await db
        .select()
        .from(bestStandards)
        .where(inArray(bestStandards.id, standardIds))
        .orderBy(asc(bestStandards.benchmarkNumber));
    } catch (error) {
      console.error("Error fetching BEST standards by IDs:", error);
      return [];
    }
  }

  async getCompetenciesWithSkills(): Promise<any[]> {
    try {
      const competenciesWithSkills = await db
        .select()
        .from(competencies)
        .leftJoin(componentSkills, eq(competencies.id, componentSkills.competencyId))
        .orderBy(competencies.name, componentSkills.name);

      // Group by competency
      const grouped = competenciesWithSkills.reduce((acc, row) => {
        const competency = row.competencies;
        const skill = row.component_skills;

        if (!acc[competency.id]) {
          acc[competency.id] = {
            ...competency,
            componentSkills: []
          };
        }

        if (skill) {
          acc[competency.id].componentSkills.push(skill);
        }

        return acc;
      }, {} as Record<number, any>);

      return Object.values(grouped);
    } catch (error) {
      console.error('Error fetching competencies with skills:', error);
      return [];
    }
  }

  async getAllComponentSkills(): Promise<any[]> {
    try {
      const skills = await db
        .select({
          id: componentSkills.id,
          name: componentSkills.name,
          rubricLevels: sql`CASE WHEN jsonb_typeof(${componentSkills.rubricLevels}) = 'object' THEN ${componentSkills.rubricLevels} ELSE '{}'::jsonb END`,
          competencyId: componentSkills.competencyId
        })
        .from(componentSkills)
        .orderBy(componentSkills.name);

      return skills;
    } catch (error) {
      console.error('Error fetching all component skills:', error);
      return [];
    }
  }
}

export const competencyStorage = new CompetencyStorage();
