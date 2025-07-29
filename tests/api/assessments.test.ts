import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { testUsers, testSchool } from '../fixtures/users';
import { testAssessment } from '../fixtures/projects';
import { storage } from '../../server/storage';

describe('Assessments API', () => {
  let teacherToken: string;
  let studentToken: string;
  let schoolId: number;
  let assessmentId: number;
  let shareCode: string;

  beforeAll(async () => {
    // Setup test school and users
    const schools = await storage.getSchools();
    const existingSchool = schools.find(s => s.name === testSchool.name);
    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const school = await storage.createSchool(testSchool);
      schoolId = school.id;
    }

    // Create teacher
    const teacherResponse = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUsers.teacher,
        email: 'assessment-teacher@psi.edu',
        schoolId
      });
    teacherToken = teacherResponse.body.token;

    // Create student
    const studentResponse = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUsers.student,
        email: 'assessment-student@psi.edu',
        schoolId
      });
    studentToken = studentResponse.body.token;
  });

  describe('Assessment Creation', () => {
    it('should create standalone assessment with questions', async () => {
      const response = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(testAssessment);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(testAssessment.title);
      expect(response.body.componentSkillIds).toEqual(testAssessment.componentSkillIds);
      expect(response.body.questions).toEqual(testAssessment.questions);
      expect(response.body.shareCode).toBeDefined();
      expect(response.body.shareCode).toMatch(/^[A-Z]{5}$/);
      
      assessmentId = response.body.id;
      shareCode = response.body.shareCode;
    });

    it('should generate AI questions for assessment', async () => {
      const response = await request(app)
        .post('/api/assessments/generate-questions')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          componentSkillIds: testAssessment.componentSkillIds,
          questionCount: 3,
          assessmentTitle: testAssessment.title
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      
      // Check question structure
      const question = response.body[0];
      expect(question.question).toBeDefined();
      expect(question.type).toBeDefined();
      expect(question.points).toBeDefined();
    });

    it('should reject assessment creation by non-teacher', async () => {
      const response = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(testAssessment);

      expect(response.status).toBe(403);
    });
  });

  describe('Assessment Share Codes', () => {
    it('should access assessment by share code', async () => {
      const response = await request(app)
        .get(`/api/assessments/by-code/${shareCode}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(testAssessment.title);
      expect(response.body.questions).toBeDefined();
    });

    it('should reject invalid share code', async () => {
      const response = await request(app)
        .get('/api/assessments/by-code/ZZZZZ')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    it('should regenerate share code', async () => {
      const response = await request(app)
        .post(`/api/assessments/${assessmentId}/regenerate-share-code`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.shareCode).toBeDefined();
      expect(response.body.shareCode).toMatch(/^[A-Z]{5}$/);
      expect(response.body.shareCode).not.toBe(shareCode);
    });
  });

  describe('Assessment Submissions', () => {
    let submissionId: number;

    it('should create assessment submission', async () => {
      const response = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assessmentId,
          answers: [
            {
              questionIndex: 0,
              answer: 'The greenhouse effect is a natural process where certain gases in the atmosphere trap heat from the sun, keeping Earth warm enough to support life.'
            },
            {
              questionIndex: 1,
              answer: 2 // Water vapor
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.assessmentId).toBe(assessmentId);
      expect(response.body.answers).toBeDefined();
      expect(response.body.submittedAt).toBeDefined();
      
      submissionId = response.body.id;
    });

    it('should get assessment submissions for teacher', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/submissions`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const submission = response.body[0];
      expect(submission.id).toBe(submissionId);
      expect(submission.answers).toBeDefined();
    });

    it('should prevent duplicate submissions', async () => {
      const response = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assessmentId,
          answers: [
            {
              questionIndex: 0,
              answer: 'Duplicate submission attempt'
            }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already submitted');
    });
  });

  describe('Assessment Grading', () => {
    let submissionId: number;

    beforeAll(async () => {
      // Get the submission we created
      const submissionsResponse = await request(app)
        .get(`/api/assessments/${assessmentId}/submissions`)
        .set('Authorization', `Bearer ${teacherToken}`);
      submissionId = submissionsResponse.body[0].id;
    });

    it('should grade submission with AI feedback', async () => {
      const response = await request(app)
        .post(`/api/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          grades: [
            {
              questionIndex: 0,
              componentSkillId: testAssessment.componentSkillIds[0],
              rubricLevel: 'proficient',
              feedback: 'Good explanation of the greenhouse effect'
            },
            {
              questionIndex: 1,
              componentSkillId: testAssessment.componentSkillIds[1],
              rubricLevel: 'applying',
              feedback: 'Correct answer'
            }
          ],
          generateAIFeedback: true
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('graded successfully');
    });

    it('should generate AI feedback for individual question', async () => {
      const response = await request(app)
        .post(`/api/submissions/${submissionId}/generate-question-feedback`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          questionIndex: 0,
          componentSkillId: testAssessment.componentSkillIds[0],
          rubricLevel: 'proficient'
        });

      expect(response.status).toBe(200);
      expect(response.body.feedback).toBeDefined();
      expect(typeof response.body.feedback).toBe('string');
      expect(response.body.feedback.length).toBeGreaterThan(10);
    });

    it('should get graded submission for student', async () => {
      const response = await request(app)
        .get(`/api/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.grades).toBeDefined();
      expect(Array.isArray(response.body.grades)).toBe(true);
      expect(response.body.grades.length).toBeGreaterThan(0);
    });
  });

  describe('Assessment Analytics', () => {
    it('should get assessment statistics', async () => {
      const response = await request(app)
        .get(`/api/assessments/${assessmentId}/stats`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalSubmissions).toBeDefined();
      expect(response.body.averageScore).toBeDefined();
      expect(response.body.completionRate).toBeDefined();
    });
  });
});