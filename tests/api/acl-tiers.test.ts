import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { appInit } from '../../server/index';
import { getTestApp } from '../helpers/test-app';
import { testSchool } from '../fixtures/users';
import { testProject } from '../fixtures/projects';
import { db } from '../../server/db';
import { schools } from '../../shared/schema';

describe('ACL & Tiers API', () => {
    let app: any;
    let authTeacherA: string;
    let authTeacherB: string;
    let authStudentA: string;
    let authStudentB: string;
    let schoolAId: number;
    let schoolBId: number;

    beforeAll(async () => {
        await appInit;
        app = await getTestApp();

        const sA = await db.insert(schools).values({ ...testSchool, name: `School ALpha ${Date.now()}` }).returning();
        schoolAId = sA[0].id;
        const sB = await db.insert(schools).values({ ...testSchool, name: `School Beta ${Date.now()}` }).returning();
        schoolBId = sB[0].id;

        const resTA = await request(app).post('/api/auth/register').send({
            username: `teacher-a-${Date.now()}`,
            password: 'TestPassword123!',
            role: 'teacher', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School',
            schoolId: schoolAId
        });
        authTeacherA = resTA.headers['set-cookie'] || [];

        const resTB = await request(app).post('/api/auth/register').send({
            username: `teacher-b-${Date.now()}`,
            password: 'TestPassword123!',
            role: 'teacher', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School',
            schoolId: schoolBId
        });
        authTeacherB = resTB.headers['set-cookie'] || [];

        const resSA = await request(app).post('/api/auth/register').send({
            username: `student-a-${Date.now()}`,
            password: 'TestPassword123!',
            role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School',
            schoolId: schoolAId
        });
        authStudentA = resSA.headers['set-cookie'] || [];

        const resSB = await request(app).post('/api/auth/register').send({
            username: `student-b-${Date.now()}`,
            password: 'TestPassword123!',
            role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School',
            schoolId: schoolBId
        });
        authStudentB = resSB.headers['set-cookie'] || [];
    });

    it('should prevent teacher from managing other-school projects (ACL-01)', async () => {
        const projectRes = await request(app).post('/api/projects').set('Cookie', authTeacherA).send(testProject);
        const projectId = projectRes.body.id;

        const delRes = await request(app).delete(`/api/projects/${projectId}`).set('Cookie', authTeacherB);

        // Either 403 or 404 depending on how the query restricts lookup
        expect([403, 404]).toContain(delRes.status);
    });

    it('should prevent student from accessing another student submissions (ACL-02)', async () => {
        const assessRes = await request(app).post('/api/assessments').set('Cookie', authTeacherA).send({
            title: 'ACL Test Assessment',
            description: 'desc',
            dueDate: new Date(Date.now() + 10000).toISOString(),
            questions: [{ type: 'open-ended', question: 'question', points: 10 }]
        });
        const assessmentId = assessRes.body.id;

        const subRes = await request(app).post('/api/submissions').set('Cookie', authStudentA).send({
            assessmentId,
            answers: [{ questionIndex: 0, answer: 'Answer A' }]
        });
        const submissionId = subRes.body.id;

        const getRes = await request(app).get(`/api/submissions/${submissionId}`).set('Cookie', authStudentB);

        expect([403, 404]).toContain(getRes.status);
    });
});
