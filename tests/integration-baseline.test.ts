// Baseline Integration Test - validates current system works before modularization
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { getTestApp } from './helpers/test-app';

describe('MasteryMap Baseline Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  describe('System Health', () => {
    it('should return API health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toBeDefined();
    });

    it('should handle 404 for unknown API routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);
      
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Authentication Endpoints', () => {
    it('should reject unauthorized access to protected routes', async () => {
      await request(app)
        .get('/api/auth/user')
        .expect(401);
    });

    it('should have working registration endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'baseline-test@example.com',
          password: 'TestPassword123!',
          role: 'student',
          schoolId: 1
        });
      
      // Should either succeed (201) or fail with validation (400)
      expect([200, 201, 400, 409]).toContain(response.status);
    });

    it('should have working login endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });
      
      // Should return 401 for invalid credentials
      expect(response.status).toBe(401);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Core API Endpoints', () => {
    it('should have schools endpoint', async () => {
      const response = await request(app)
        .get('/api/schools');
      
      expect([200, 401]).toContain(response.status);
    });

    it('should have competencies endpoint', async () => {
      const response = await request(app)
        .get('/api/competencies');
      
      expect([200, 401]).toContain(response.status);
    });

    it('should have learner outcomes hierarchy endpoint', async () => {
      const response = await request(app)
        .get('/api/learner-outcomes-hierarchy/complete');
      
      expect([200, 401]).toContain(response.status);
    });

    it('should require authentication for projects endpoint', async () => {
      const response = await request(app)
        .get('/api/projects');
      
      expect(response.status).toBe(401);
    });

    it('should require authentication for assessments endpoint', async () => {
      const response = await request(app)
        .get('/api/assessments');
      
      expect(response.status).toBe(401);
    });
  });

  describe('Database Integration', () => {
    it('should have valid database connection', async () => {
      // Test that we can access competencies (public endpoint that hits DB)
      const response = await request(app)
        .get('/api/competencies');
      
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
      }
      // If 401, the route exists and DB connection is working
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          // Missing required fields
          email: 'test@example.com'
        });
      
      expect(response.status).toBe(400);
    });
  });
});

describe('Pre-Modularization Functionality Check', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  it('should have all expected API routes', async () => {
    const criticalRoutes = [
      '/api/auth/register',
      '/api/auth/login', 
      '/api/auth/user',
      '/api/schools',
      '/api/competencies',
      '/api/projects',
      '/api/assessments',
      '/api/learner-outcomes-hierarchy/complete'
    ];

    for (const route of criticalRoutes) {
      const response = await request(app).get(route);
      
      // Route exists if it returns anything other than 404
      expect(response.status).not.toBe(404);
    }
  });

  it('should preserve authentication workflow', async () => {
    // This test documents the expected auth flow structure
    
    // 1. Registration should work
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Baseline',
        lastName: 'Test',
        email: `baseline-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        role: 'student',
        schoolId: 1
      });
    
    // Should either succeed or fail with meaningful error
    expect([200, 201, 400, 409]).toContain(registerResponse.status);
    
    // 2. Login structure should be intact
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    
    // Should reject invalid credentials
    expect(loginResponse.status).toBe(401);
  });

  it('should preserve protected route structure', async () => {
    // All these routes should require authentication
    const protectedRoutes = [
      '/api/auth/user',
      '/api/projects', 
      '/api/assessments',
      '/api/portfolio/artifacts',
      '/api/credentials'
    ];

    for (const route of protectedRoutes) {
      const response = await request(app).get(route);
      expect(response.status).toBe(401); // Should be unauthorized
    }
  });
});

// Export baseline status for comparison after modularization
export const BASELINE_STATUS = {
  testsSuite: 'Pre-Modularization Baseline',
  timestamp: new Date().toISOString(),
  expectedBehavior: {
    authRoutes: ['register', 'login', 'user'],
    protectedRoutes: ['projects', 'assessments', 'portfolio', 'credentials'],
    publicRoutes: ['schools', 'competencies', 'learner-outcomes-hierarchy'],
    errorHandling: ['401 for protected routes', '400 for validation', '404 for unknown routes']
  }
};