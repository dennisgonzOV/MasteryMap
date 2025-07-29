// Assessments Service - data access layer for assessments domain
import { storage } from '../../storage';

export class AssessmentsService {
  
  async getAssessmentsByTeacher(teacherId: number) {
    return await storage.getAssessmentsByTeacher(teacherId);
  }

  async getAssessmentsForStudent(studentId: number) {
    return await storage.getAssessmentsForStudent(studentId);
  }
}