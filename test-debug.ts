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
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        schoolName: 'Test School',
        schoolId: s[0].id
    });
    console.log("Status:", res.status);
    console.log("Cookie:", res.headers['set-cookie']);

    const cookie = res.headers['set-cookie'];
    const userRes = await request(app).get('/api/auth/user').set('Cookie', cookie);
    console.log("User Status:", userRes.status);
    console.log("User Body:", userRes.body);

    process.exit(0);
};
run();
