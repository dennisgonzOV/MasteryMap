import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { appInit } from '../../server/index';
import { getTestApp } from '../helpers/test-app';
import { testSchool } from '../fixtures/users';
import { db } from '../../server/db';
import { schools } from '../../shared/schema';

describe('Portfolio Signatures API', () => {
    let app: any;
    let authToken: string;

    beforeAll(async () => {
        await appInit;
        app = await getTestApp();

        let schoolId;
        const existingSchools = await db.select().from(schools);
        const existingSchool = existingSchools.find(s => s.name === testSchool.name);
        if (existingSchool) {
            schoolId = existingSchool.id;
        } else {
            const [school] = await db.insert(schools).values(testSchool).returning();
            schoolId = school.id;
        }

        const regRes = await request(app).post('/api/auth/register').send({
            username: `student-port-${Date.now()}`,
            password: 'TestPassword123!',
            role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School',
            schoolId
        });
        authToken = regRes.headers['set-cookie'] || [];
    });

    it('should generate signed URL and validate signatures', async () => {
        const shareRes = await request(app)
            .get('/api/portfolio/share-link?expirationDays=7')
            .set('Cookie', authToken);

        expect(shareRes.status).toBe(200);
        const { portfolioUrl, expiresAt } = shareRes.body;
        expect(portfolioUrl).toBeDefined();
        expect(expiresAt).toBeDefined();

        // Extract pathname and query from the returned full URL string
        const urlObj = new URL(portfolioUrl);
        const pathname = urlObj.pathname;
        const validSig = urlObj.searchParams.get('sig');

        // Request with valid sig
        const validRes = await request(app).get(`${pathname}?expiresAt=${encodeURIComponent(expiresAt)}&sig=${validSig}`);
        expect(validRes.status).toBe(200);

        // Modified signature (403)
        const invalidSig = validSig + 'X';
        const invalidRes = await request(app).get(`${pathname}?expiresAt=${encodeURIComponent(expiresAt)}&sig=${invalidSig}`);
        expect(invalidRes.status).toBe(403);

        // Expired signature (410)
        // Controller checks expiration before checking signature match
        const pastDate = new Date(Date.now() - 100000).toISOString();
        const expiredRes = await request(app).get(`${pathname}?expiresAt=${encodeURIComponent(pastDate)}&sig=${validSig}`);
        expect(expiredRes.status).toBe(410);
    });
});
