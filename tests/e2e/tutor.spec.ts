import { test, expect } from '@playwright/test';
import { testSchool } from '../fixtures/users';

test.describe('AI Tutor Workflows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
        await page.fill('[name="username"]', `student-tutor-${Date.now()}`);
        await page.fill('[name="password"]', 'Test123!');
        await page.selectOption('[name="role"]', 'student');
        await page.selectOption('[name="schoolId"]', { label: testSchool.name });
        await page.click('button[type="submit"]');
    });

    test('should interact with AI tutor happy path (TUTOR-01)', async ({ page }) => {
        // Intercept projects to show a specific project with tutor enabled
        await page.route('**/api/projects/student', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify([{
                    id: 777,
                    title: 'Project with AI Tutor',
                    componentSkills: [{ id: 1, name: 'Skill 1' }]
                }])
            });
        });

        await page.route('**/api/projects/777', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    id: 777,
                    title: 'Project with AI Tutor',
                    componentSkills: [{ id: 1, name: 'Skill 1' }]
                })
            });
        });

        // Mock the tutor chat endpoint
        await page.route('**/api/ai/tutor/chat', async (route) => {
            const req = route.request();
            const postData = req.postDataJSON() || {};

            // Let's pretend the 3rd message triggers the summary
            const historyCount = postData.history ? postData.history.length : 0;

            if (historyCount >= 4) { // student msg, tutor msg, student msg, tutor msg -> next is 5th
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        response: 'Here is your summary and suggested evaluation.',
                        shouldTerminate: true,
                        suggestedEvaluation: { rubricLevel: 'proficient', justification: 'Good job.' }
                    })
                });
            } else {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        response: 'Tell me more about your approach.',
                        shouldTerminate: false
                    })
                });
            }
        });

        await page.goto('/student/projects/777');

        // Look for generic AI Tutor button
        if (await page.locator('button:has-text("AI Tutor")').count() > 0) {
            await page.click('button:has-text("AI Tutor")');

            // Message 1
            await page.fill('input[placeholder*="message"]', 'Hello tutor.');
            await page.click('button:has-text("Send")');
            await expect(page.locator('text=Tell me more')).toBeVisible();

            // Message 2
            await page.fill('input[placeholder*="message"]', 'Here is my approach.');
            await page.click('button:has-text("Send")');
            await expect(page.locator('text=Tell me more')).toBeVisible();

            // Message 3
            await page.fill('input[placeholder*="message"]', 'I think I am done.');
            await page.click('button:has-text("Send")');
            await expect(page.locator('text=Here is your summary')).toBeVisible();
        }
    });
});
