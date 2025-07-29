// Portfolio Service - data access layer for portfolio domain  
import { storage } from '../../storage';

export class PortfolioService {
  
  async getPortfolioArtifacts(userId: number) {
    return await storage.getPortfolioArtifacts(userId);
  }
}