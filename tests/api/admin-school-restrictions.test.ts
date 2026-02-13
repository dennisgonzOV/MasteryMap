import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app';
import { authStorage } from '../../server/domains/auth/auth.storage';
import { db } from '../../server/db';
import { schools, users, UserRole } from '../../shared/schema';
import bcrypt from 'bcryptjs';

describe('Admin School Restrictions API', () => {
    let app: Awaited<ReturnType<typeof getTestApp>>;
    let agent: request.SuperTest<request.Test>;
    let schoolAId: number;
    let schoolBId: number;
    let adminSchoolAId: number;
    let studentSchoolAId: number;
    let studentSchoolBId: number;
    let freeUserId: number;

    // Unique suffix for this test run
    const suffix = Date.now().toString();

    beforeAll(async () => {
        app = await getTestApp();
        agent = request.agent(app);

        const [sA] = await db.insert(schools).values({ name: `School A Restriction Test ${suffix}` }).returning();
        schoolAId = sA.id;
        const [sB] = await db.insert(schools).values({ name: `School B Restriction Test ${suffix}` }).returning();
        schoolBId = sB.id;

        const hashedPassword = await bcrypt.hash('password123', 10);

        const adminSchoolA = await authStorage.createUser({
            username: `admin_school_a_${suffix}`,
            password: hashedPassword,
            role: UserRole.ADMIN,
            schoolId: schoolAId,
            tier: 'enterprise',
            firstName: 'Admin',
            lastName: 'A',
            schoolName: 'School A'
        });
        adminSchoolAId = adminSchoolA.id;

        const studentSchoolA = await authStorage.createUser({
            username: `student_school_a_${suffix}`,
            password: hashedPassword,
            role: UserRole.STUDENT,
            schoolId: schoolAId,
            tier: 'enterprise',
            firstName: 'Student',
            lastName: 'A',
            schoolName: 'School A'
        });
        studentSchoolAId = studentSchoolA.id;

        const studentSchoolB = await authStorage.createUser({
            username: `student_school_b_${suffix}`,
            password: hashedPassword,
            role: UserRole.STUDENT,
            schoolId: schoolBId,
            tier: 'enterprise',
            firstName: 'Student',
            lastName: 'B',
            schoolName: 'School B'
        });
        studentSchoolBId = studentSchoolB.id;

        const freeUser = await authStorage.createUser({
            username: `free_user_restriction_${suffix}`,
            password: hashedPassword,
            role: UserRole.STUDENT,
            tier: 'free',
            firstName: 'Free',
            lastName: 'User',
            schoolName: 'None'
        });
        freeUserId = freeUser.id;

        await agent
            .post('/api/auth/login')
            .send({
                username: `admin_school_a_${suffix}`,
                password: 'password123'
            });
    });

    it('Admin A should only see users from School A', async () => {
        const response = await agent.get('/api/admin/users');
        expect(response.status).toBe(200);

        const userList = response.body as Array<{ id: number }>;
        const userIds = userList.map((u) => u.id);

        expect(userIds).toContain(studentSchoolAId);
        expect(userIds).not.toContain(studentSchoolBId);
        expect(userIds).not.toContain(freeUserId);
    });

    it('Admin A should NOT be able to delete user from School B', async () => {
        const response = await agent.delete(`/api/admin/users/${studentSchoolBId}`);
        // Expecting failure (403 or 404 depending on implementation masking)
        expect(response.status).toBe(403);
    });

    it('Analytics dashboard should only show School A stats', async () => {
        // Re-login to ensure session is valid
        await agent
            .post('/api/auth/login')
            .send({
                username: `admin_school_a_${suffix}`,
                password: 'password123'
            });

        const response = await agent.get('/api/admin/analytics/dashboard');
        expect(response.status).toBe(200);

        // We expect only users from School A
        // Admin A + Student A = 2 users
        expect(response.body.totalUsers).toBe(2);

        // Check strict filtering
        const allUsersCount = (await db.select().from(users)).length;
        expect(response.body.totalUsers).toBeLessThan(allUsersCount);
    });
});
