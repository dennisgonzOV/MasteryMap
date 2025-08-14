import { competencyStorage, type ICompetencyStorage } from './competencies.storage';
import { 
  type Competency,
  type ComponentSkill,
  type BestStandard
} from "../../../shared/schema";

export interface ICompetencyService {
  getAllCompetencies(): Promise<Competency[]>;
  getAllComponentSkills(): Promise<ComponentSkill[]>;
  getComponentSkillsByCompetency(competencyId: number): Promise<ComponentSkill[]>;
  getAllBestStandards(): Promise<BestStandard[]>;
  getBestStandardsByCompetency(competencyId: number): Promise<BestStandard[]>;
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
}

export const competencyService = new CompetencyService();