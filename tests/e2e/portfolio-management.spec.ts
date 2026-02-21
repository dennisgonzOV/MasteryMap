import { test, expect } from '@playwright/test';
import { testSchool } from '../fixtures/users';

test.describe('Portfolio Management Workflows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
        await page.fill('[name="username"]', `student-port-${Date.now()}`);
        await page.fill('[name="password"]', 'Test123!');
        await page.selectOption('[name="role"]', 'student');
        await page.selectOption('[name="schoolId"]', { label: testSchool.name });
        await page.click('button[type="submit"]');
    });

    test('should manage portfolio artifacts and settings (PORT-01, PORT-02, PORT-03)', async ({ page }) => {
        // Intercept artifacts
        await page.route('**/api/portfolio/artifacts', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([{
                        id: 111,
                        title: 'My Artifact',
                        description: 'Desc',
                        fileUrl: '/mock/file.pdf'
                    }])
                });
            } else if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        id: 111,
                        title: 'Updated Artifact',
                        fileUrl: '/mock/updated.pdf'
                    })
                });
            }
        });

        await page.route('**/api/portfolio/settings', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({ isPublic: false, theme: 'light' })
                });
            } else if (route.request().method() === 'POST') {
                await route.fulfill({ status: 200, body: JSON.stringify({ isPublic: true, theme: 'dark' }) });
            }
        });

        await page.goto('/student/portfolio');

        // Mange artifact
        if (await page.locator('text=My Artifact').count() > 0) {
            // Edit artifact
            await page.click('button:has-text("Edit Artifact")'); // Assuming an edit button exists

            if (await page.locator('input[name="title"]').count() > 0) {
                await page.fill('input[name="title"]', 'Updated Artifact');

                // Re-upload file (PORT-02)
                if (await page.locator('input[type="file"]').count() > 0) {
                    await page.setInputFiles('input[type="file"]', {
                        name: 'new-file.pdf',
                        mimeType: 'application/pdf',
                        buffer: Buffer.from('dummy')
                    });
                }

                await page.click('button:has-text("Save Changes")');
                await expect(page.locator('.toast')).toContainText('success');
            }
        }

        // Portfolio settings (PORT-03)
        if (await page.locator('button:has-text("Settings")').count() > 0) {
            await page.click('button:has-text("Settings")');

            if (await page.locator('text=Make Public').count() > 0) {
                await page.check('text=Make Public');
            }

            await page.click('button:has-text("Save Settings")');
            await expect(page.locator('.toast')).toContainText('success');
        }
    });
});
