import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { appInit } from '../../server/index';
import { getTestApp } from '../helpers/test-app';
import { testSchool } from '../fixtures/users';
import { db } from '../../server/db';
import { schools } from '../../shared/schema';

describe('Competencies API', () => {
    let app: any;
    let token: string;

    beforeAll(async () => {
        await appInit;
        app = await getTestApp();

        let schoolId;
        const existingSchools = await db.select().from(schools);
        const existingSchool = existingSchools.find(s => s.name === testSchool.name);
        if (existingSchool) {
            schoolId = existingSchool.id;
        } else {
            const schoolRes = await db.insert(schools).values({ ...testSchool, name: `School Comp ${Date.now()}` }).returning();
            schoolId = schoolRes[0].id;
        }

        const res = await request(app).post('/api/auth/register').send({
            username: `teacher-comp-${Date.now()}`,
            password: 'TestPassword123!',
            role: 'teacher', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School',
            schoolId
        });
        token = res.headers['set-cookie'] || [];
    });

    it('should retrieve learner outcome hierarchy (COMP-01)', async () => {
        const res = await request(app).get('/api/competencies/learner-outcomes').set('Cookie', token);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0].competencies).toBeDefined();
            if (res.body[0].competencies.length > 0) {
                expect(res.body[0].competencies[0].componentSkills).toBeDefined();
            }
        }
    });

    it('should retrieve standards metadata (COMP-02)', async () => {
        const res = await request(app).get('/api/competencies/learner-outcomes?subject=English').set('Cookie', token);
        expect(res.status).toBe(200);
    });
});
