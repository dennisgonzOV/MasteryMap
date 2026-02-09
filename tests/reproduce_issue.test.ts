import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, appInit } from '../server/index';
import { testUsers, testSchool } from './fixtures/users';
import { testAssessment } from './fixtures/projects';
import { db } from '../server/db';
import { schools } from '../shared/schema';
import { eq } from 'drizzle-orm';

describe('Assessment Update Reproduction', () => {
    let agent: any;
    let schoolId: number;
    let assessmentId: number;

    beforeAll(async () => {
        await appInit;
        agent = request.agent(app);

        // Setup test school
        const existingSchool = await db.select().from(schools).where(eq(schools.name, testSchool.name)).limit(1);
        if (existingSchool.length > 0) {
            schoolId = existingSchool[0].id;
        } else {
            const [school] = await db.insert(schools).values(testSchool).returning();
            schoolId = school.id;
        }

        // Create teacher
        // We append timestamp to username to ensure uniqueness across runs
        const username = `update-test-teacher-${Date.now()}`;
        const teacherResponse = await agent
            .post('/api/auth/register')
            .send({
                ...testUsers.teacher,
                username,
                schoolId
            });

        if (teacherResponse.status !== 201 && teacherResponse.status !== 200) {
            console.error('Registration failed:', teacherResponse.body);
        }
    });

    it('should create an assessment and fail to update due date', async () => {
        // 1. Create Assessment
        const createResponse = await agent
            .post('/api/assessments')
            .send({
                ...testAssessment,
                title: 'Assessment to Update',
                dueDate: new Date().toISOString()
            });

        expect(createResponse.status).toBe(200);
        assessmentId = createResponse.body.id;

        // 2. Attempt to Update Due Date
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + 7); // 1 week later

        // Use the exact date part to avoid timezone issues in comparison
        const newDueDateISO = newDueDate.toISOString();

        console.log(`Attempting to update assessment ${assessmentId} with due date: ${newDueDateISO}`);

        const updateResponse = await agent
            .patch(`/api/assessments/${assessmentId}`)
            .send({
                dueDate: newDueDateISO
            });

        expect(updateResponse.status).toBe(200);

        // 3. Verify Update
        const getResponse = await agent
            .get(`/api/assessments/${assessmentId}`);

        expect(getResponse.status).toBe(200);
        const updatedAssessment = getResponse.body;

        console.log('Original Due Date:', createResponse.body.dueDate);
        console.log('Requested Due Date:', newDueDateISO);
        console.log('Actual Updated Due Date:', updatedAssessment.dueDate);

        // Assert that the date part matches
        expect(new Date(updatedAssessment.dueDate).toISOString().split('T')[0]).toBe(newDueDateISO.split('T')[0]);

        // 4. Attempt to Clear Due Date (Send null)
        console.log(`Attempting to clear due date for assessment ${assessmentId}`);

        const clearResponse = await agent
            .patch(`/api/assessments/${assessmentId}`)
            .send({
                dueDate: null
            });

        expect(clearResponse.status).toBe(200);

        // 5. Verify Cleared Due Date
        const getClearedResponse = await agent
            .get(`/api/assessments/${assessmentId}`);

        expect(getClearedResponse.status).toBe(200);
        expect(getClearedResponse.body.dueDate).toBeNull();
    });
});
