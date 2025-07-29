// Portfolio Service - business logic layer for portfolio domain  
import { PortfolioRepository } from './portfolio.repository';

export class PortfolioService {
  private portfolioRepo = new PortfolioRepository();
  
  async getPortfolioArtifacts(userId: number) {
    return await this.portfolioRepo.getPortfolioArtifactsByStudent(userId);
  }
}