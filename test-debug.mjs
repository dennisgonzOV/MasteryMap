import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { appInit, app } from './server/index.ts';
import { db } from './server/db.ts';
import { schools } from './shared/schema.ts';

const run = async () => {
    await appInit;
    const s = await db.insert(schools).values({ name: `Test ${Date.now()}`, address: '', city: '', state: '', zipCode: '' }).returning();
    const res = await request(app).post('/api/auth/register').send({
        username: `debug-${Date.now()}`,
        password: 'TestPassword123!',
        role: 'student',
        schoolId: s[0].id
    });
    console.log("Status:", res.status);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    process.exit(0);
};
run();
