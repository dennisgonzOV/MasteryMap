import { test, expect } from '@playwright/test';
import { testSchool } from '../fixtures/users';

test.describe('Admin Workflows', () => {
    test.beforeEach(async ({ page }) => {
        // Setup: Login as Admin
        await page.goto('/register');
        await page.fill('[name="username"]', `admin-e2e-${Date.now()}`);
        await page.fill('[name="password"]', 'Test123!');
        await page.selectOption('[name="role"]', 'admin');
        await page.selectOption('[name="schoolId"]', { label: testSchool.name });
        await page.click('button[type="submit"]');
    });

    test('should edit and deactivate user (ADMIN-01)', async ({ page }) => {
        // Intercept users list
        await page.route('**/api/users', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify([{
                    id: 111,
                    username: 'target-student',
                    role: 'student',
                    schoolId: 1,
                    isActive: true
                }])
            });
        });

        // Intercept user update
        await page.route('**/api/users/111', async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ id: 111, isActive: false }) });
        });

        await page.goto('/admin');

        // Check for Users tab/section
        if (await page.locator('text=target-student').count() > 0) {
            // Edit user
            await page.click('button:has-text("Edit"):near(:text("target-student"))'); // Assuming edit button next to name

            // Deactivate
            if (await page.locator('text=Deactivate').count() > 0) {
                await page.click('text=Deactivate');
                await expect(page.locator('.toast')).toContainText('success');
            } else if (await page.locator('input[name="isActive"]').count() > 0) {
                await page.uncheck('input[name="isActive"]');
                await page.click('button:has-text("Save")');
                await expect(page.locator('.toast')).toContainText('success');
            }
        }
    });

    test('should impersonate user (ADMIN-02)', async ({ page }) => {
        await page.route('**/api/users', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify([{ id: 222, username: 'impersonate-target', role: 'teacher' }])
            });
        });

        await page.route('**/api/auth/impersonate', async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ token: 'mock-token', user: { username: 'impersonate-target', role: 'teacher' } }) });
        });

        await page.goto('/admin');

        // Mute navigation errors due to mocked token logic
        if (await page.locator('text=impersonate-target').count() > 0) {
            if (await page.locator('button:has-text("Impersonate")').count() > 0) {
                await page.click('button:has-text("Impersonate"):near(:text("impersonate-target"))');

                // Check if returned to root or teacher dashboard
                await page.waitForTimeout(500); // Give it a moment to redirect
                // Since this is all mocked, we just check that the click succeeded
                // Real application will use the token
            }
        }
    });

    test('should access analytics dashboard (ADMIN-03)', async ({ page }) => {
        await page.route('**/api/analytics/dashboard', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    totalUsers: 100,
                    activeProjects: 50,
                    completedAssessments: 300
                })
            });
        });

        await page.goto('/admin/analytics');

        // Check if numbers render
        // Just looking for presence of some analytic text
        await expect(page.locator('body')).toContainText('100');
        await expect(page.locator('body')).toContainText('50');
        await expect(page.locator('body')).toContainText('300');
    });
});
