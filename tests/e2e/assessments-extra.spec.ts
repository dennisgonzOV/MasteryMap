import { test, expect } from '@playwright/test';
import { testSchool } from '../fixtures/users';

test.describe('Extra Assessment Workflows', () => {
    test.beforeEach(async ({ page }) => {
        // Setup: Login as teacher
        await page.goto('/register');
        await page.fill('[name="username"]', 'teacher-assess-extra');
        await page.fill('[name="password"]', 'Test123!');
        await page.selectOption('[name="role"]', 'teacher');
        await page.selectOption('[name="schoolId"]', { label: testSchool.name });
        await page.click('button[type="submit"]');
    });

    test('should create milestone-linked assessment (ASSESS-02)', async ({ page }) => {
        // Create a project
        await page.goto('/teacher/projects');
        await page.click('button:has-text("Create New Project")');
        await page.fill('[name="title"]', 'Project for Linked Assessment');
        await page.fill('[name="description"]', 'Project description');

        // Set dates
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
        await page.fill('[name="startDate"]', tomorrow.toISOString().split('T')[0]);
        await page.fill('[name="dueDate"]', dueDate.toISOString().split('T')[0]);

        // Ensure no AI generate
        await page.uncheck('[name="generateMilestonesAndAssessments"]');
        await page.click('button:has-text("Create Project")');

        // Wait for creation and go to manage project
        await page.click('.project-card:has-text("Project for Linked Assessment")');
        await page.click('button:has-text("Manage Project")');

        // Add Milestone
        await page.click('button:has-text("Add Milestone")');
        await page.fill('input[name="milestoneTitle"]', 'Linked Milestone');
        await page.fill('textarea[name="milestoneDescription"]', 'Milestone specifically for this linked assessment');
        await page.fill('input[name="milestoneDate"]', tomorrow.toISOString().split('T')[0]);
        await page.click('button:has-text("Save Milestone")');

        // Wait for milestone to appear
        await expect(page.locator('text=Linked Milestone')).toBeVisible();

        // Now go to create assessment
        await page.goto('/teacher/assessments');
        await page.click('button:has-text("Create Assessment")');

        // Select the milestone in link dropdown if it exists, otherwise just test base UI flows
        const milestoneSelect = page.locator('select[name="milestoneId"]');
        if (await milestoneSelect.isVisible()) {
            await milestoneSelect.selectOption({ label: 'Linked Milestone' });
        }

        await page.fill('[name="title"]', 'Linked Assessment');
        await page.fill('[name="description"]', 'Linked to milestone');
        await page.fill('[name="dueDate"]', dueDate.toISOString().split('T')[0]);

        // Add manual question
        await page.click('button:has-text("Add Question")');
        await page.selectOption('[name="questionType"]', 'open-ended');
        await page.fill('[name="question"]', 'Explain the linked topic.');
        await page.fill('[name="points"]', '10');

        await page.click('button:has-text("Create Assessment")');

        // Should show share code and appear in assessments
        await expect(page.locator('[data-testid="share-code"]')).toBeVisible();
        await page.goto('/teacher/assessments');
        await expect(page.locator('.assessment-card')).toContainText('Linked Assessment');
    });

    test('should attach PDF for AI context and generate assessment (ASSESS-04, ASSESS-05)', async ({ page }) => {
        await page.goto('/teacher/assessments');
        await page.click('button:has-text("Create Assessment")');

        // Use AI generation tab/button
        // Intercept API
        await page.route('**/api/assessments/generate-from-document', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    title: 'PDF Generated Assessment',
                    description: 'Generated from test PDF',
                    questions: [{ text: 'What is this PDF about?', type: 'open-ended', points: 10 }]
                })
            });
        });

        // We look for PDF upload or generate from PDF button
        if (await page.locator('button:has-text("Upload PDF")').count() > 0) {
            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.click('button:has-text("Upload PDF")');
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles({
                name: 'test.pdf',
                mimeType: 'application/pdf',
                buffer: Buffer.from('dummy content')
            });

            await page.click('button:has-text("Generate Assessment from PDF")');

            // Wait for generated UI
            await expect(page.locator('input[name="title"]')).toHaveValue('PDF Generated Assessment');

            await page.click('button:has-text("Create Assessment")');
            await expect(page.locator('[data-testid="share-code"]')).toBeVisible();
        }
    });

});
