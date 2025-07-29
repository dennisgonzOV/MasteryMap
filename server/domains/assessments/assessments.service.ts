// Assessments Service - business logic layer for assessments domain
import { AssessmentsRepository } from './assessments.repository';

export class AssessmentsService {
  private assessmentsRepo = new AssessmentsRepository();
  
  async getAssessmentsByTeacher(teacherId: number) {
    return await this.assessmentsRepo.getAssessmentsByTeacher(teacherId);
  }

  async getAssessmentsForStudent(studentId: number) {
    return await this.assessmentsRepo.getAssessmentsForStudent(studentId);
  }
}