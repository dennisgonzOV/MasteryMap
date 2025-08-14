import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { 
  competencies,
  componentSkills,
  bestStandards,
  type Competency,
  type ComponentSkill,
  type BestStandard
} from "../../../shared/schema";

export interface ICompetencyStorage {
  getCompetencies(): Promise<Competency[]>;
  getComponentSkills(): Promise<ComponentSkill[]>;
  getComponentSkillsByCompetency(competencyId: number): Promise<ComponentSkill[]>;
  getBestStandards(): Promise<BestStandard[]>;
  getBestStandardsByCompetency(competencyId: number): Promise<BestStandard[]>;
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
      .orderBy(asc(bestStandards.code));
  }

  async getBestStandardsByCompetency(competencyId: number): Promise<BestStandard[]> {
    return await db
      .select()
      .from(bestStandards)
      .where(eq(bestStandards.competencyId, competencyId))
      .orderBy(asc(bestStandards.code));
  }
}

export const competencyStorage = new CompetencyStorage();