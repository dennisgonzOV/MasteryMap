import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { appInit } from '../../server/index';
import { getTestApp } from '../helpers/test-app';
import { testSchool } from '../fixtures/users';
import { testAssessment } from '../fixtures/projects';
import { db } from '../../server/db';
import { schools } from '../../shared/schema';

describe('Self-Evaluation API', () => {
    let app: any;
    let authTeacher: string[];
    let authStudent: string[];
    let assessmentId: number;
    let selfEvalId: number;

    beforeAll(async () => {
        await appInit;
        app = await getTestApp();

        let schoolId;
        const existingSchools = await db.select().from(schools);
        const existingSchool = existingSchools.find(s => s.name === testSchool.name);
        if (existingSchool) {
            schoolId = existingSchool.id;
        } else {
            const schoolRes = await db.insert(schools).values({ ...testSchool, name: `School SE ${Date.now()}` }).returning();
            schoolId = schoolRes[0].id;
        }

        const teacherRes = await request(app).post('/api/auth/register').send({
            username: `teacher-se-${Date.now()}`,
            password: 'TestPassword123!',
            role: 'teacher', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School',
            schoolId
        });
        authTeacher = teacherRes.headers['set-cookie'] || [];

        const studentRes = await request(app).post('/api/auth/register').send({
            username: `student-se-${Date.now()}`,
            password: 'TestPassword123!',
            role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School',
            schoolId
        });
        authStudent = studentRes.headers['set-cookie'] || [];

        const assessmentReq = await request(app).post('/api/assessments').set('Cookie', authTeacher).send({
            ...testAssessment,
            assessmentType: 'self-evaluation',
            questions: []
        });
        assessmentId = assessmentReq.body.id;
    });

    it('should create and retrieve student self-evaluations (SELF-02)', async () => {
        const createRes = await request(app).post('/api/self-evaluations').set('Cookie', authStudent).send({
            assessmentId,
            rubricLevel: 'proficient',
            justification: 'I understand the concepts well and can apply them.',
            componentSkillId: testAssessment.componentSkillIds?.[0] || null
        });

        // Ensure success
        if (createRes.status !== 200) {
            console.error(createRes.body);
        }
        expect(createRes.status).toBe(200);
        selfEvalId = createRes.body.selfEvaluation.id;

        const getStudentRes = await request(app).get('/api/self-evaluations/student').set('Cookie', authStudent);
        expect(getStudentRes.status).toBe(200);
        expect(getStudentRes.body.length).toBeGreaterThan(0);

        const getTeacherRes = await request(app).get(`/api/self-evaluations/assessment/${assessmentId}`).set('Cookie', authTeacher);
        if (!getTeacherRes.body.some((se: any) => se.id === selfEvalId)) {
            console.error('getTeacherRes missing se:', getTeacherRes.body);
        }
        expect(getTeacherRes.status).toBe(200);
        expect(getTeacherRes.body.some((se: any) => se.id === selfEvalId)).toBe(true);
    });

    it('should flag risky self-evaluations (SAFE-02)', async () => {
        // Teacher flags it as risky
        const flagRes = await request(app).post(`/api/self-evaluations/${selfEvalId}/flag-risky`).set('Cookie', authTeacher);

        expect(flagRes.status).toBe(200);
        expect(flagRes.body.message).toBe('Self-evaluation flagged and teacher notified');
    });
});
