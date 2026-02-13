import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app';

describe('Authentication Rate Limiting', () => {
    let app: any;

    beforeAll(async () => {
        app = await getTestApp();
    });

    it('should allow more than 5 login attempts (limit relaxed to 20)', async () => {
        const attempts = 6;
        const promises = [];

        for (let i = 0; i < attempts; i++) {
            // Sequential requests to ensure rate limiter tracks them correctly in time
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistentuser',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401); // Should be Unauthorized, not Too Many Requests
        }
    });
});
