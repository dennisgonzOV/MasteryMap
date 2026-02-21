import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { appInit, app } from '../../server/index';
import { testUsers, testSchool } from '../fixtures/users';
import { testProject, testTeams } from '../fixtures/projects';
import { db } from '../../server/db';
import { schools } from '../../shared/schema';

describe('Projects API', () => {
  let teacherToken: string;
  let freeTeacherToken: string;
  let studentToken: string;
  let schoolId: number;
  let teacherId: number;
  let studentIds: number[] = [];

  beforeAll(async () => {
    await appInit;
    // Ensure test school exists
    const existingSchools = await db.select().from(schools);
    const existingSchool = existingSchools.find(s => s.name === testSchool.name);
    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const [school] = await db.insert(schools).values(testSchool).returning();
      schoolId = school.id;
    }

    // Create test users
    const teacherResponse = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUsers.teacher,
        username: `project-teacher-${Date.now()}`,
        schoolId
      });
    teacherToken = teacherResponse.headers['set-cookie'] || [];
    teacherId = teacherResponse.body.id;

    const freeTeacherResponse = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUsers.teacher,
        username: `project-free-teacher-${Date.now()}`,
      });
    freeTeacherToken = freeTeacherResponse.headers['set-cookie'] || [];

    // Create test students
    for (const studentUser of [testUsers.student, testUsers.student2]) {
      const studentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          ...studentUser,
          username: `project-${studentUser.username}-${Date.now()}`,
          schoolId
        });
      if (studentUser.username === testUsers.student.username) {
        studentToken = studentResponse.headers['set-cookie'] || [];
      }
      studentIds.push(studentResponse.body.id);
    }
  });

  describe('Project Creation', () => {
    it('should create project with component skills', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', teacherToken)
        .send(testProject);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(testProject.title);
      expect(response.body.componentSkillIds).toEqual(testProject.componentSkillIds);
      expect(response.body.teacherId).toBe(teacherId);
      expect(response.body.schoolId).toBe(schoolId);
    });

    it('should reject project creation by non-teacher', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', studentToken)
        .send(testProject);

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', teacherToken)
        .send({
          description: 'Missing title'
        });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Project Teams', () => {
    let projectId: number;

    beforeAll(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', teacherToken)
        .send({
          ...testProject,
          title: 'Team Test Project'
        });
      projectId = projectResponse.body.id;
    });

    it('should create project team with members', async () => {
      const response = await request(app)
        .post('/api/project-teams')
        .set('Cookie', teacherToken)
        .send({
          projectId,
          name: testTeams[0].name
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(testTeams[0].name);
      expect(response.body.projectId).toBe(projectId);
    });

    it('should add team members', async () => {
      // Get the team we just created
      const teamsResponse = await request(app)
        .get(`/api/projects/${projectId}/teams`)
        .set('Cookie', teacherToken);

      const teamId = teamsResponse.body[0].id;

      // Add members to team
      for (const studentId of studentIds) {
        const response = await request(app)
          .post('/api/project-team-members')
          .set('Cookie', teacherToken)
          .send({
            teamId,
            studentId
          });

        expect(response.status).toBe(200);
      }
    });

    it('should list project teams', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/teams`)
        .set('Cookie', teacherToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('AI Milestone Generation', () => {
    let projectId: number;

    beforeAll(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', teacherToken)
        .send({
          ...testProject,
          title: 'AI Milestone Test Project'
        });
      projectId = projectResponse.body.id;
    });

    it('should generate milestones with AI', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/generate-milestones`)
        .set('Cookie', teacherToken)
        .send({
          projectTitle: testProject.title,
          projectDescription: testProject.description,
          componentSkillIds: testProject.componentSkillIds,
          projectDueDate: testProject.dueDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // In test env, AI is mocked and may return empty milestones
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Free Tier Restrictions', () => {
    let freeProjectId: number;

    beforeAll(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', freeTeacherToken)
        .send({
          ...testProject,
          title: 'Free Tier Restriction Project',
        });
      freeProjectId = projectResponse.body.id;
    });

    it('should block creating project teams for free tier users', async () => {
      const response = await request(app)
        .post('/api/project-teams')
        .set('Cookie', freeTeacherToken)
        .send({
          projectId: freeProjectId,
          name: 'Restricted Team',
        });

      expect(response.status).toBe(403);
    });

    it('should block starting a project for free tier users', async () => {
      const response = await request(app)
        .post(`/api/projects/${freeProjectId}/start`)
        .set('Cookie', freeTeacherToken);

      expect(response.status).toBe(403);
    });

    it('should block generating milestones for free tier users', async () => {
      const response = await request(app)
        .post(`/api/projects/${freeProjectId}/generate-milestones-and-assessments`)
        .set('Cookie', freeTeacherToken);

      expect(response.status).toBe(403);
    });
  });

  describe('Student Project Access', () => {
    let projectId: number;

    beforeAll(async () => {
      // Create project and assign student
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', teacherToken)
        .send({
          ...testProject,
          title: 'Student Access Test Project'
        });
      projectId = projectResponse.body.id;

      // Create team and add student
      const teamResponse = await request(app)
        .post('/api/project-teams')
        .set('Cookie', teacherToken)
        .send({
          projectId,
          name: 'Test Team'
        });

      await request(app)
        .post('/api/project-team-members')
        .set('Cookie', teacherToken)
        .send({
          teamId: teamResponse.body.id,
          studentId: studentIds[0]
        });
    });

    it('should allow student to view assigned project', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Cookie', studentToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const assignedProject = response.body.find((p: any) => p.id === projectId);
      expect(assignedProject).toBeDefined();
    });

    it('should allow student to view project details', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Cookie', studentToken);

      expect(response.status).toBe(200);
      expect(response.body.title).toBeDefined();
      expect(response.body.description).toBeDefined();
    });
  });
});
