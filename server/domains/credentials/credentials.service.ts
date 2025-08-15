import { credentialStorage, type ICredentialStorage } from './credentials.storage';
import { 
  type Credential,
  type InsertCredential
} from "../../../shared/schema";

export interface ICredentialService {
  getStudentCredentials(studentId: number): Promise<Credential[]>;
  getTeacherStats(teacherId: number): Promise<Credential[]>;
  awardCredential(credentialData: InsertCredential): Promise<Credential>;
  updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential>;
}

export class CredentialService implements ICredentialService {
  constructor(private storage: ICredentialStorage = credentialStorage) {}

  async getStudentCredentials(studentId: number): Promise<Credential[]> {
    return await this.storage.getCredentialsByStudent(studentId);
  }

  async getTeacherStats(teacherId: number): Promise<Credential[]> {
    // For now, return student credentials - this would be enhanced to show 
    // credentials awarded by this teacher across their projects
    return await this.storage.getCredentialsByStudent(teacherId);
  }

  async awardCredential(credentialData: InsertCredential): Promise<Credential> {
    return await this.storage.createCredential(credentialData);
  }

  async updateCredential(id: number, updates: Partial<InsertCredential>): Promise<Credential> {
    return await this.storage.updateCredential(id, updates);
  }
}

export const credentialService = new CredentialService();