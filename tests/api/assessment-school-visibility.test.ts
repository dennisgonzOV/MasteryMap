
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app';
import { authStorage } from '../../server/domains/auth/auth.storage';
import { db } from '../../server/db';
import { schools, users, projects, milestones, assessments, UserRole } from '../../shared/schema';
import bcrypt from 'bcryptjs';

describe('Assessment School Visibility', () => {
    let app: Awaited<ReturnType<typeof getTestApp>>;
    let agent: request.SuperTest<request.Test>;
    let schoolId: number;
    let teacherId: number;
    let adminId: number;
    let projectId: number;
    let milestoneId: number;
    let assessmentId: number;

    const suffix = Date.now().toString();

    beforeAll(async () => {
        app = await getTestApp();
        agent = request.agent(app);

        // 1. Create a school
        const [school] = await db.insert(schools).values({ name: `Test School ${suffix}` }).returning();
        schoolId = school.id;

        const hashedPassword = await bcrypt.hash('password123', 10);

        // 2. Create a teacher in that school
        const teacher = await authStorage.createUser({
            username: `teacher_${suffix}`,
            password: hashedPassword,
            role: UserRole.TEACHER,
            schoolId: schoolId,
            tier: 'free',
            firstName: 'Teacher',
            lastName: 'Test',
            schoolName: 'Test School'
        });
        teacherId = teacher.id;

        // 3. Create an admin in that school (to test visibility)
        const admin = await authStorage.createUser({
            username: `admin_${suffix}`,
            password: hashedPassword,
            role: UserRole.ADMIN,
            schoolId: schoolId,
            tier: 'enterprise',
            firstName: 'Admin',
            lastName: 'Test',
            schoolName: 'Test School'
        });
        adminId = admin.id;

        // 4. Create a "Legacy" Project (belongs to teacher, but schoolId is NULL)
        // This simulates projects created before schoolId was added to projects table
        const [project] = await db.insert(projects).values({
            title: `Legacy Project ${suffix}`,
            teacherId: teacherId,
            schoolId: null, // explicit null
        }).returning();
        projectId = project.id;

        // 5. Create a milestone
        const [milestone] = await db.insert(milestones).values({
            projectId: projectId,
            title: 'Milestone 1',
        }).returning();
        milestoneId = milestone.id;

        // 6. Create a "Legacy" Assessment (createdBy is NULL, relies on project linkage)
        // AND project.schoolId is NULL.
        const [assessment] = await db.insert(assessments).values({
            title: `Legacy Assessment ${suffix}`,
            milestoneId: milestoneId,
            createdBy: null, // explicit null, older assessments might not have this
            questions: [{ text: 'Question 1', type: 'text' }],
            assessmentType: 'teacher'
        }).returning();
        assessmentId = assessment.id;

        // Login as Admin
        await agent
            .post('/api/auth/login')
            .send({
                username: `admin_${suffix}`,
                password: 'password123'
            });
    });

    it('should include assessment when project owner belongs to school, even if project.schoolId is null', async () => {
        // This endpoint likely calls getAssessmentsForSchool under the hood when logged in as admin/teacher
        // or we can test the query directly if we exported it, but integration test is better.
        // Assuming there is an endpoint like /api/assessments/school or similar,
        // OR checking if it appears in a list.
        // Let's check `GET /api/assessments?schoolId=...` OR assuming the bug report implies
        // a specific query usage. The user said "teachers that dont show any assessments when toggleing all school assessments".
        // This suggests an endpoint that filters by school.

        // Let's look at `assessments.controller.ts` to see exposed endpoints.
        // For now, I will assume we can't easily hit the controller without knowing the exact route,
        // so I will import the query class directly to test the logic in isolation first,
        // mirroring the unit test approach for queries.

        // Wait, I can't easily import the class method in a supertest file without instantiating it.
        // Let's try to hit the API if possible.
        // If not, I'll use the storage class directly.

        const { AssessmentAssessmentQueries } = await import('../../server/domains/assessments/assessments-storage-assessment.queries');
        const queries = new AssessmentAssessmentQueries();

        const schoolAssessments = await queries.getAssessmentsForSchool(schoolId);

        const found = schoolAssessments.find(a => a.id === assessmentId);

        // This EXPECT should FAIL before the fix
        expect(found).toBeDefined();
    });

    it('should NOT include assessment from another school', async () => {
        // Create another school and assessment
        const [schoolB] = await db.insert(schools).values({ name: `School B ${suffix}` }).returning();

        const teacherB = await authStorage.createUser({
            username: `teacher_b_${suffix}`,
            password: 'password123', // hashed in real usage but mock might handle it or we reuse
            role: UserRole.TEACHER,
            schoolId: schoolB.id,
            tier: 'free',
            firstName: 'Teacher',
            lastName: 'B',
            schoolName: 'School B'
        });

        const [projectB] = await db.insert(projects).values({
            title: `Project B ${suffix}`,
            teacherId: teacherB.id,
            schoolId: schoolB.id,
        }).returning();

        const [assessmentB] = await db.insert(assessments).values({
            title: `Assessment B ${suffix}`,
            createdBy: teacherB.id,
            questions: [{ text: 'Q', type: 'text' }],
            assessmentType: 'teacher'
        }).returning();

        const { AssessmentAssessmentQueries } = await import('../../server/domains/assessments/assessments-storage-assessment.queries');
        const queries = new AssessmentAssessmentQueries();

        const schoolAssessments = await queries.getAssessmentsForSchool(schoolId);
        const foundB = schoolAssessments.find(a => a.id === assessmentB.id);

        expect(foundB).toBeUndefined();
    });
});
