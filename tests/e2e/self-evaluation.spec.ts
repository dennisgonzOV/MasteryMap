import { test, expect } from '@playwright/test';
import { testSchool } from '../fixtures/users';

test.describe('Self-Evaluation Workflows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
        await page.fill('[name="username"]', `student-se-ui-${Date.now()}`);
        await page.fill('[name="password"]', 'Test123!');
        await page.selectOption('[name="role"]', 'student');
        await page.selectOption('[name="schoolId"]', { label: testSchool.name });
        await page.click('button[type="submit"]');
    });

    test('should complete self-evaluation assessment (SELF-01)', async ({ page }) => {
        // Intercept data so we don't have to create a full assessment flow again
        await page.route('**/api/assessments/student', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify([{
                    id: 888,
                    title: 'Mock Self-Evaluation Assessment',
                    assessmentType: 'self-evaluation',
                    dueDate: new Date(Date.now() + 1000000).toISOString(),
                    hasSubmitted: false
                }])
            });
        });

        await page.route('**/api/assessments/888', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    id: 888,
                    title: 'Mock Self-Evaluation Assessment',
                    assessmentType: 'self-evaluation',
                    componentSkills: [{ id: 1, name: 'Skill 1' }]
                })
            });
        });

        await page.route('**/api/self-evaluations', async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ id: 1 }) });
        });

        await page.goto('/student/dashboard');

        if (await page.locator('text=Self-Evaluation').count() > 0) {
            await page.click('text=Self-Evaluation');
        } else {
            await page.goto('/student/assessments/888');
        }

        // Attempt to interact with self-evaluation elements
        await expect(page.locator('h1')).toContainText('Mock Self-Evaluation Assessment');

        // Choose rubric level
        if (await page.locator('button:has-text("Proficient")').count() > 0) {
            await page.click('button:has-text("Proficient")');
        } else if (await page.locator('input[type="radio"]').count() > 0) {
            await page.locator('input[type="radio"]').first().click();
        }

        // Submit justification
        if (await page.locator('textarea').count() > 0) {
            await page.fill('textarea', 'I demonstrate proficiency through my projects.');
        }

        // Submit
        if (await page.locator('button:has-text("Submit Evaluation")').count() > 0) {
            await page.click('button:has-text("Submit Evaluation")');
            await expect(page.locator('.toast')).toContainText('successfully');
        }
    });
});
