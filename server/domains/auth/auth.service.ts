// Authentication Service - business logic layer for auth domain
import { AuthRepository } from './auth.repository';
import type { InsertUser, SelectUser } from '../../../shared/schema';

export class AuthService {
  private authRepo = new AuthRepository();
  
  async findUserByEmail(email: string): Promise<SelectUser | null> {
    return await this.authRepo.getUserByEmail(email);
  }

  async findUserById(id: number): Promise<SelectUser | null> {
    return await this.authRepo.getUserById(id);
  }

  async createUser(userData: InsertUser): Promise<SelectUser> {
    return await this.authRepo.createUser(userData);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<SelectUser | null> {
    return await this.authRepo.updateUser(id, updates);
  }

  async deleteUser(id: number): Promise<boolean> {
    return await this.authRepo.deleteUser(id);
  }

  async getAllUsers(): Promise<SelectUser[]> {
    return await this.authRepo.getAllUsers();
  }

  async getUsersByRole(role: 'admin' | 'teacher' | 'student'): Promise<SelectUser[]> {
    return await this.authRepo.getUsersByRole(role);
  }

  async getUsersBySchool(schoolId: number): Promise<SelectUser[]> {
    return await this.authRepo.getUsersBySchool(schoolId);
  }
}