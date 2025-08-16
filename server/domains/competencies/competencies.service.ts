import { competencyStorage, type ICompetencyStorage } from './competencies.storage';
import { 
  type Competency,
  type ComponentSkill,
  type BestStandard,
  type LearnerOutcome
} from "../../../shared/schema";

export interface ICompetencyService {
  getAllCompetencies(): Promise<Competency[]>;
  getAllComponentSkills(): Promise<ComponentSkill[]>;
  getComponentSkillsByCompetency(competencyId: number): Promise<ComponentSkill[]>;
  getAllBestStandards(): Promise<BestStandard[]>;
  getBestStandardsByCompetency(competencyId: number): Promise<BestStandard[]>;
  getBestStandardsBySubject(subject: string): Promise<BestStandard[]>;
  getBestStandardsByGrade(grade: string): Promise<BestStandard[]>;
  searchBestStandards(searchTerm: string): Promise<BestStandard[]>;
  getBestStandardsMetadata(): Promise<{ subjects: string[], grades: string[] }>;

  // 3-Level Hierarchy operations
  getLearnerOutcomes(): Promise<LearnerOutcome[]>;
  getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>>;
  getCompetenciesByLearnerOutcome(learnerOutcomeId: number): Promise<Competency[]>;
  getComponentSkillsWithDetails(): Promise<any[]>;
  getComponentSkillsByIds(skillIds: number[]): Promise<any[]>;
}

export class CompetencyService implements ICompetencyService {
  constructor(private storage: ICompetencyStorage = competencyStorage) {}

  async getAllCompetencies(): Promise<Competency[]> {
    return await this.storage.getCompetencies();
  }

  async getAllComponentSkills(): Promise<ComponentSkill[]> {
    return await this.storage.getComponentSkills();
  }

  async getComponentSkillsByCompetency(competencyId: number): Promise<ComponentSkill[]> {
    return await this.storage.getComponentSkillsByCompetency(competencyId);
  }

  async getAllBestStandards(): Promise<BestStandard[]> {
    return await this.storage.getBestStandards();
  }

  async getBestStandardsByCompetency(competencyId: number): Promise<BestStandard[]> {
    return await this.storage.getBestStandardsByCompetency(competencyId);
  }

  async getBestStandardsBySubject(subject: string): Promise<BestStandard[]> {
    return await this.storage.getBestStandardsBySubject(subject);
  }

  async getBestStandardsByGrade(grade: string): Promise<BestStandard[]> {
    return await this.storage.getBestStandardsByGrade(grade);
  }

  async getBestStandardsMetadata(): Promise<{ subjects: string[], grades: string[] }> {
    return this.storage.getBestStandardsMetadata();
  }

  async searchBestStandards(searchTerm: string): Promise<BestStandard[]> {
    return await this.storage.searchBestStandards(searchTerm);
  }

  // 3-Level Hierarchy operations
  async getLearnerOutcomes(): Promise<LearnerOutcome[]> {
    return await this.storage.getLearnerOutcomes();
  }

  async getLearnerOutcomesWithCompetencies(): Promise<Array<LearnerOutcome & { competencies: Array<Competency & { componentSkills: ComponentSkill[] }> }>> {
    return await this.storage.getLearnerOutcomesWithCompetencies();
  }

  async getCompetenciesByLearnerOutcome(learnerOutcomeId: number): Promise<Competency[]> {
    return await this.storage.getCompetenciesByLearnerOutcome(learnerOutcomeId);
  }

  async getComponentSkillsWithDetails(): Promise<any[]> {
    return await this.storage.getComponentSkillsWithDetails();
  }

  async getComponentSkillsByIds(skillIds: number[]): Promise<any[]> {
    return await this.storage.getComponentSkillsByIds(skillIds);
  }
}

export const competencyService = new CompetencyService();