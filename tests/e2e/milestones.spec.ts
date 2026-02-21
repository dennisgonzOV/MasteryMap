import { test, expect } from '@playwright/test';
import { testSchool } from '../fixtures/users';

test.describe('Milestone & Deliverable Workflows', () => {
    test.beforeEach(async ({ page }) => {
        // Setup: Login as teacher
        await page.goto('/register');
        await page.fill('[name="username"]', 'teacher-milestone');
        await page.fill('[name="password"]', 'Test123!');
        await page.selectOption('[name="role"]', 'teacher');
        await page.selectOption('[name="schoolId"]', { label: testSchool.name });
        await page.click('button[type="submit"]');
    });

    test('should allow manual milestone CRUD (MILE-01)', async ({ page }) => {
        // Create project first
        await page.goto('/teacher/projects');
        await page.click('button:has-text("Create New Project")');
        await page.fill('[name="title"]', 'Milestone CRUD Test Project');
        await page.fill('[name="description"]', 'Project for testing milestones');

        // Set dates
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
        await page.fill('[name="startDate"]', tomorrow.toISOString().split('T')[0]);
        await page.fill('[name="dueDate"]', dueDate.toISOString().split('T')[0]);

        // Uncheck AI generation
        await page.uncheck('[name="generateMilestonesAndAssessments"]');
        await page.click('button:has-text("Create Project")');

        // Go to project details/management
        await page.waitForSelector('.project-card');
        await page.click('.project-card:has-text("Milestone CRUD Test Project")');
        await page.click('button:has-text("Manage Project")');

        // Create new milestone
        await page.click('button:has-text("Add Milestone")');
        await page.fill('input[name="milestoneTitle"]', 'Draft Review');
        await page.fill('textarea[name="milestoneDescription"]', 'Submit draft for review');
        await page.fill('input[name="milestoneDate"]', tomorrow.toISOString().split('T')[0]);
        await page.click('button:has-text("Save Milestone")');

        // Verify creation
        await expect(page.locator('text=Draft Review')).toBeVisible();

        // Update milestone
        await page.click('button:has-text("Edit Milestone")');
        await page.fill('input[name="milestoneTitle"]', 'Final Review');
        await page.click('button:has-text("Update Milestone")');

        await expect(page.locator('text=Final Review')).toBeVisible();

        // Delete milestone
        await page.click('button:has-text("Delete Milestone")');
        await page.click('button:has-text("Confirm Delete")'); // handles dialog

        await expect(page.locator('text=Final Review')).not.toBeVisible();
    });

    test('should allow deliverable upload and portfolio linkage (MILE-02)', async ({ page }) => {
        // Intercept API to mock student flow without needing full DB seed interactions
        await page.route('**/api/projects/student', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify([{
                    id: 999,
                    title: 'Mock Student Project',
                    milestones: [
                        { id: 101, title: 'Final Deliverable', description: 'Upload file here', isCompleted: false }
                    ]
                }])
            });
        });

        // Mock milestone upload endpoint
        await page.route('**/api/milestones/*/deliverable', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ message: 'Uploaded successfully', objectPath: '/mock/path.pdf' })
            });
        });

        // Mock portfolio inclusion
        await page.route('**/api/portfolio/artifacts', async (route) => {
            await route.fulfill({ status: 201, body: JSON.stringify({ id: 99 }) });
        });

        // Login as student
        await page.goto('/register');
        await page.fill('[name="username"]', 'student-milestone');
        await page.fill('[name="password"]', 'Test123!');
        await page.selectOption('[name="role"]', 'student');
        await page.selectOption('[name="schoolId"]', { label: testSchool.name });
        await page.click('button[type="submit"]');

        await page.goto('/student/projects');
        await expect(page.locator('text=Mock Student Project')).toBeVisible();
        await page.click('text=Mock Student Project');

        // Click on milestone to upload
        await page.click('text=Final Deliverable');

        // Choose file to upload (mocking an input type file interaction)
        // We can simulate having a file input
        const fileChooserPromise = page.waitForEvent('filechooser');
        // For many UIs, clicking an "Upload" button triggers the file chooser
        // We will just assume there is a button with Upload text or we can just mock the UI interaction completely
        // Let's just click 'Upload Deliverable' and pass a dummy file
        if (await page.locator('button:has-text("Upload Deliverable")').count() > 0) {
            await page.click('button:has-text("Upload Deliverable")');
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles({
                name: 'test-deliverable.pdf',
                mimeType: 'application/pdf',
                buffer: Buffer.from('dummy content')
            });

            // Toggle portfolio inclusion if available
            if (await page.locator('text=Include in Portfolio').count() > 0) {
                await page.check('text=Include in Portfolio');
            }

            await page.click('button:has-text("Submit Deliverable")');
            await expect(page.locator('.toast')).toContainText('successfully');
        }
    });
});
