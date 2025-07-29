// Credentials Service - data access layer for credentials domain
import { storage } from '../../storage';

export class CredentialsService {
  
  async getCredentialsByStudent(studentId: number) {
    return await storage.getCredentialsByStudent(studentId);
  }
}