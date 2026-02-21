import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app';
import { testUsers, testSchool } from '../fixtures/users';
import { authStorage } from '../../server/domains/auth/auth.storage';
import { db } from '../../server/db';
import { schools, UserRole } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

describe('Admin Bulk Create API', () => {
    let app: any;
    let agent: any;
    let schoolId: number;

    beforeAll(async () => {
        try {
            app = await getTestApp();
            agent = request.agent(app);

            // Ensure test school exists
            const existingSchools = await db.select().from(schools).where(eq(schools.name, testSchool.name));
            if (existingSchools.length > 0) {
                schoolId = existingSchools[0].id;
            } else {
                const [school] = await db.insert(schools).values(testSchool).returning();
                schoolId = school.id;
            }

            // Create admin user - ensure clean state
            let adminUser = await authStorage.getUserByUsername('admin_bulk_test');
            if (adminUser) {
                await authStorage.deleteAuthTokensByUserId(adminUser.id);
                await authStorage.deleteUser(adminUser.id);
            }

            const hashedPassword = await bcrypt.hash('password123', 10);
            await authStorage.createUser({
                username: 'admin_bulk_test',
                password: hashedPassword,
                role: UserRole.ADMIN,
                schoolId: schoolId,
                tier: 'enterprise',
            });

            // Login as admin
            const loginResponse = await agent
                .post('/api/auth/login')
                .send({
                    username: 'admin_bulk_test',
                    password: 'password123'
                });

            expect(loginResponse.status).toBe(200);
            // Cookies are saved in agent automatically
        } catch (err) {
            console.error('Setup failed:', err);
        }
    });

    it('should bulk create valid users', async () => {
        const ts = Date.now();
        const studentUsername = `bulk_student_${ts}`;
        const teacherUsername = `bulk_teacher_${ts}`;
        const usersToCreate = [
            { username: studentUsername, password: 'password123', role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School', grade: '9' },
            { username: teacherUsername, password: 'password123', role: 'teacher', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School' }
        ];

        const response = await agent
            .post('/api/admin/users/bulk')
            .send(usersToCreate);

        if (response.status !== 200) {
            console.log('Bulk Create Failed:', JSON.stringify(response.body, null, 2));
        }

        expect(response.status).toBe(200);
        expect(response.body.created).toHaveLength(2);
        expect(response.body.failed).toHaveLength(0);

        // Verify users exist
        const student = await authStorage.getUserByUsername(studentUsername);
        expect(student).toBeDefined();
        expect(student?.role).toBe('student');

        const teacher = await authStorage.getUserByUsername(teacherUsername);
        expect(teacher).toBeDefined();
        expect(teacher?.role).toBe('teacher');
    });

    it('should handle partial failures', async () => {
        const ts = Date.now();
        const existingUsername = `bulk_existing_${ts}`;
        const newUsername = `bulk_new_${ts}`;

        // First create a user that will collide
        await agent
            .post('/api/admin/users/bulk')
            .send([{ username: existingUsername, password: 'password123', role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School', grade: '9' }]);

        // Now try to create the existing user again along with a new user
        const usersToCreate = [
            { username: existingUsername, password: 'password123', role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School', grade: '9' },
            { username: newUsername, password: 'password123', role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School', grade: '9' }
        ];

        const response = await agent
            .post('/api/admin/users/bulk')
            .send(usersToCreate);

        if (response.status !== 200) console.error("Bulk Create Error:", JSON.stringify(response.body, null, 2));

        expect(response.status).toBe(200);
        expect(response.body.created).toHaveLength(1); // newUsername
        expect(response.body.failed).toHaveLength(1); // existingUsername
        expect(response.body.failed[0].username).toBe(existingUsername);
        expect(response.body.failed[0].reason).toContain('exists');
    });

    it('should enforce limit of 50 users', async () => {
        const usersToCreate = Array.from({ length: 51 }, (_, i) => ({
            username: `bulk_limit_${i}`, password: 'password123', role: 'student', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School', grade: '9'
        }));

        const response = await agent
            .post('/api/admin/users/bulk')
            .send(usersToCreate);

        expect(response.status).toBe(400);
        expect(JSON.stringify(response.body)).toContain('Maximum 50 users');
    });

    it('should reject invalid roles', async () => {
        const usersToCreate = [
            { username: 'bulk_admin_fail', password: 'password123', role: 'admin', firstName: 'Test', lastName: 'User', email: 'test@test.com', schoolName: 'Test School' }
        ];

        const response = await agent
            .post('/api/admin/users/bulk')
            .send(usersToCreate);

        expect(response.status).toBe(200);
        expect(response.body.failed).toHaveLength(1);
        expect(response.body.failed[0].reason).toContain('Cannot create admin');
    });

});
