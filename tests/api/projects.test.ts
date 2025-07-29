import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';
import { testUsers, testSchool } from '../fixtures/users';
import { testProject, testTeams } from '../fixtures/projects';
import { storage } from '../../server/storage';

describe('Projects API', () => {
  let teacherToken: string;
  let studentToken: string;
  let schoolId: number;
  let teacherId: number;
  let studentIds: number[] = [];

  beforeAll(async () => {
    // Ensure test school exists
    const schools = await storage.getSchools();
    const existingSchool = schools.find(s => s.name === testSchool.name);
    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const school = await storage.createSchool(testSchool);
      schoolId = school.id;
    }

    // Create test users
    const teacherResponse = await request(app)
      .post('/api/auth/register')
      .send({
        ...testUsers.teacher,
        email: 'project-teacher@psi.edu',
        schoolId
      });
    teacherToken = teacherResponse.body.token;
    teacherId = teacherResponse.body.user.id;

    // Create test students
    for (const studentUser of [testUsers.student, testUsers.student2]) {
      const studentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          ...studentUser,
          email: `project-${studentUser.email}`,
          schoolId
        });
      if (studentUser.email === testUsers.student.email) {
        studentToken = studentResponse.body.token;
      }
      studentIds.push(studentResponse.body.user.id);
    }
  });

  describe('Project Creation', () => {
    it('should create project with component skills', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${teacherToken}`)
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
        .set('Authorization', `Bearer ${studentToken}`)
        .send(testProject);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Only teachers');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          description: 'Missing title'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Project Teams', () => {
    let projectId: number;

    beforeAll(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          ...testProject,
          title: 'Team Test Project'
        });
      projectId = projectResponse.body.id;
    });

    it('should create project team with members', async () => {
      const response = await request(app)
        .post('/api/project-teams')
        .set('Authorization', `Bearer ${teacherToken}`)
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
        .set('Authorization', `Bearer ${teacherToken}`);
      
      const teamId = teamsResponse.body[0].id;

      // Add members to team
      for (const studentId of studentIds) {
        const response = await request(app)
          .post('/api/project-team-members')
          .set('Authorization', `Bearer ${teacherToken}`)
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
        .set('Authorization', `Bearer ${teacherToken}`);

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
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          ...testProject,
          title: 'AI Milestone Test Project'
        });
      projectId = projectResponse.body.id;
    });

    it('should generate milestones with AI', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/generate-milestones`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          projectTitle: testProject.title,
          projectDescription: testProject.description,
          componentSkillIds: testProject.componentSkillIds,
          projectDueDate: testProject.dueDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check milestone structure
      const milestone = response.body[0];
      expect(milestone.title).toBeDefined();
      expect(milestone.description).toBeDefined();
      expect(milestone.dueDate).toBeDefined();
      expect(new Date(milestone.dueDate)).toBeInstanceOf(Date);
    });
  });

  describe('Student Project Access', () => {
    let projectId: number;

    beforeAll(async () => {
      // Create project and assign student
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          ...testProject,
          title: 'Student Access Test Project'
        });
      projectId = projectResponse.body.id;

      // Create team and add student
      const teamResponse = await request(app)
        .post('/api/project-teams')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          projectId,
          name: 'Test Team'
        });

      await request(app)
        .post('/api/project-team-members')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          teamId: teamResponse.body.id,
          studentId: studentIds[0]
        });
    });

    it('should allow student to view assigned project', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      const assignedProject = response.body.find((p: any) => p.id === projectId);
      expect(assignedProject).toBeDefined();
    });

    it('should allow student to view project details', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBeDefined();
      expect(response.body.description).toBeDefined();
    });
  });
});