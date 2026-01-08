import { portfolioStorage, type IPortfolioStorage } from './portfolio.storage';
import { 
  type PortfolioArtifact,
  type InsertPortfolioArtifact,
  type Credential,
  type User
} from "../../../shared/schema";

export interface PublicPortfolioData {
  student: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
  artifacts: PortfolioArtifact[];
  credentials: Credential[];
}

export interface IPortfolioService {
  getStudentArtifacts(studentId: number): Promise<PortfolioArtifact[]>;
  createArtifact(artifactData: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  updateArtifact(id: number, updates: Partial<InsertPortfolioArtifact>): Promise<PortfolioArtifact>;
  getPublicPortfolio(studentId: number): Promise<PublicPortfolioData | null>;
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

  async getPublicPortfolio(studentId: number): Promise<PublicPortfolioData | null> {
    const student = await this.storage.getStudentById(studentId);
    if (!student || student.role !== 'student') {
      return null;
    }

    const [artifacts, credentials] = await Promise.all([
      this.storage.getPublicArtifactsByStudent(studentId),
      this.storage.getCredentialsByStudent(studentId)
    ]);

    return {
      student: {
        id: student.id,
        username: student.username,
        profileImageUrl: student.profileImageUrl
      },
      artifacts,
      credentials
    };
  }
}

export const portfolioService = new PortfolioService();