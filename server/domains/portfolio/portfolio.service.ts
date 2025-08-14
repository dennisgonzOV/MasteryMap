import { portfolioStorage, type IPortfolioStorage } from './portfolio.storage';
import { 
  type PortfolioArtifact,
  type InsertPortfolioArtifact
} from "../../../shared/schema";

export interface IPortfolioService {
  getStudentArtifacts(studentId: number): Promise<PortfolioArtifact[]>;
  createArtifact(artifactData: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  updateArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact>;
}

export class PortfolioService implements IPortfolioService {
  constructor(private storage: IPortfolioStorage = portfolioStorage) {}

  async getStudentArtifacts(studentId: number): Promise<PortfolioArtifact[]> {
    return await this.storage.getPortfolioArtifactsByStudent(studentId);
  }

  async createArtifact(artifactData: InsertPortfolioArtifact): Promise<PortfolioArtifact> {
    return await this.storage.createPortfolioArtifact(artifactData);
  }

  async updateArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact> {
    return await this.storage.updatePortfolioArtifact(id, updates);
  }
}

export const portfolioService = new PortfolioService();