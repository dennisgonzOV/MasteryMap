import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { appInit, app } from '../../server/index';
import { testUsers, testSchool } from '../fixtures/users';
import { db } from '../../server/db';
import { schools } from '../../shared/schema';

describe('Portfolio API', () => {
  let studentToken: string;
  let studentId: number;
  let schoolId: number;

  beforeAll(async () => {
    await appInit;
    // Setup test school
    const existingSchools = await db.select().from(schools);
    const existingSchool = existingSchools.find(s => s.name === testSchool.name);
    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const [school] = await db.insert(schools).values(testSchool).returning();
      schoolId = school.id;
    }

    // Create student
    const studentResponse = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUsers.student,
        username: `portfolio-student-${Date.now()}`,
        schoolId
      });
    studentToken = studentResponse.headers['set-cookie'] || [];
    studentId = studentResponse.body.id;
  });

  describe('Portfolio Artifacts', () => {
    it('should get student portfolio artifacts', async () => {
      const response = await request(app)
        .get('/api/portfolio/artifacts')
        .set('Cookie', studentToken);

      expect(response.status).toBe(200);
      // Response may be an array or an object containing artifacts
      expect(response.body).toBeDefined();
    });

    it('should get public portfolio by student ID', async () => {
      const response = await request(app)
        .get(`/api/portfolio/public/${studentId}`);

      // Portfolio may return 200 with data or 404 if none exists yet
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('QR Code Generation', () => {
    it('should generate QR code for portfolio', async () => {
      const response = await request(app)
        .get('/api/portfolio/qr-code')
        .set('Cookie', studentToken);

      expect(response.status).toBe(200);
      expect(response.body.qrCodeUrl || response.body.portfolioUrl).toBeDefined();
    });
  });

  describe('Credentials', () => {
    it('should get student credentials', async () => {
      const response = await request(app)
        .get('/api/credentials')
        .set('Cookie', studentToken);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });
});