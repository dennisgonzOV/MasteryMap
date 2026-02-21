import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app';

describe('Public Rate Limits', () => {
    let app: any;

    beforeAll(async () => {
        app = await getTestApp();
    });

    it('should limit contact requests to 3 per hour per IP', async () => {
        const payload = {
            name: 'Rate Limit Test User',
            email: 'ratelimit@example.com',
            message: 'Testing rate limits on contact form'
        };

        // Send 3 requests (should succeed)
        for (let i = 0; i < 3; i++) {
            const response = await request(app)
                .post('/api/contact')
                .send(payload);

            // Expected status is 201 for a successful insert
            expect(response.status).toBe(201);
        }

        // The 4th request should be rate-limited
        const limitedResponse = await request(app)
            .post('/api/contact')
            .send(payload);

        expect(limitedResponse.status).toBe(429);
        expect(limitedResponse.text).toContain('Too many contact requests');
    });
});
