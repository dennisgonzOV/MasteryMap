import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app';
import { testUsers, testSchool } from '../fixtures/users';
import { storage } from '../../server/storage.modular';

describe('Authentication API', () => {
  let app: any;
  let schoolId: number;

  beforeAll(async () => {
    app = await getTestApp();
    // Ensure test school exists
    const schools = await storage.getSchools();
    const existingSchool = schools.find(s => s.name === testSchool.name);
    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const school = await storage.createSchool(testSchool);
      schoolId = school.id;
    }
  });

  describe('User Registration', () => {
    it('should register a new teacher successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUsers.newTeacher,
          schoolId
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUsers.newTeacher.email);
      expect(response.body.user.role).toBe('teacher');
      expect(response.body.token).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUsers.teacher,
          email: 'invalid-email',
          schoolId
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUsers.teacher,
          email: 'new@test.com',
          password: '123',
          schoolId
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('password');
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      // First register the user
      await request(app)
        .post('/api/auth/register')
        .send({
          ...testUsers.teacher,
          schoolId
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.teacher.email,
          password: testUsers.teacher.password
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.teacher.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('Protected Routes', () => {
    let authToken: string;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.teacher.email,
          password: testUsers.teacher.password
        });
      authToken = loginResponse.body.token;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(testUsers.teacher.email);
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/auth/user');

      expect(response.status).toBe(401);
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
    });
  });
});