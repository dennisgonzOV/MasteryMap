// Credentials Service - business logic layer for credentials domain
import { CredentialsRepository } from './credentials.repository';

export class CredentialsService {
  private credentialsRepo = new CredentialsRepository();
  
  async getCredentialsByStudent(studentId: number) {
    return await this.credentialsRepo.getCredentialsByStudent(studentId);
  }
}