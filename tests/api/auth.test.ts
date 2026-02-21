import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app';
import { testUsers, testSchool } from '../fixtures/users';
import { db } from '../../server/db';
import { schools } from '../../shared/schema';

describe('Authentication API', () => {
  let app: any;
  let schoolId: number;

  beforeAll(async () => {
    app = await getTestApp();
    // Ensure test school exists
    const existingSchools = await db.select().from(schools);
    const existingSchool = existingSchools.find(s => s.name === testSchool.name);
    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const [school] = await db.insert(schools).values(testSchool).returning();
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

      if (response.status !== 201) console.error("Register Error:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUsers.newTeacher.username);
      expect(response.body.user.role).toBe('teacher');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject registration with invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUsers.teacher,
          username: 'ab',
          schoolId
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('username');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUsers.teacher,
          username: 'newuser',
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
          username: testUsers.teacher.username,
          password: testUsers.teacher.password
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsers.teacher.username,
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
          username: testUsers.teacher.username,
          password: testUsers.teacher.password
        });
      authToken = loginResponse.headers['set-cookie'] || [];
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .set('Cookie', authToken);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUsers.teacher.username);
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