import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app';
import { db } from '../../server/db';
import { schools } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Authentication Case Insensitivity', () => {
    let app: any;
    let schoolId: number;
    const username = 'MixedCaseUser';
    const password = 'Password123!';

    beforeAll(async () => {
        app = await getTestApp();

        // Ensure test school exists directly via DB
        const existingSchool = await db.select().from(schools).where(eq(schools.name, 'Test School')).limit(1);

        if (existingSchool.length > 0) {
            schoolId = existingSchool[0].id;
        } else {
            const inserted = await db.insert(schools).values({
                name: 'Test School',
                // shareableSlug is not in schema I saw, ignoring it based on schema.ts at line 53
                // address etc are optional
            }).returning();
            schoolId = inserted[0].id;
        }

        // Register user with mixed case
        await request(app)
            .post('/api/auth/register')
            .send({
                username,
                password,
                firstName: 'Mixed',
                lastName: 'Case',
                email: 'mixed@example.com',
                schoolName: 'Test School',
                role: 'student',
                schoolId
            });
    });

    it('should login with exact casing', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                username,
                password
            });

        expect(response.status).toBe(200);
    });

    it('should login with mismatched casing (lowercase)', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                username: username.toLowerCase(),
                password
            });

        expect(response.status).toBe(200);
    });

    it('should login with mismatched casing (uppercase)', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                username: username.toUpperCase(),
                password
            });

        expect(response.status).toBe(200);
    });
});
