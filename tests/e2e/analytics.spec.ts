import { test, expect } from '@playwright/test';
import { testUsers, testSchool } from '../fixtures/users';

test.describe('Analytics and Reporting', () => {
  test.describe('Teacher Analytics', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: Login as teacher
      await page.goto('/register');
      await page.fill('[name="firstName"]', 'Analytics');
      await page.fill('[name="lastName"]', 'Teacher');
      await page.fill('[name="email"]', 'e2e-analytics-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.selectOption('[name="role"]', 'teacher');
      await page.selectOption('[name="schoolId"]', { label: testSchool.name });
      await page.click('button[type="submit"]');

      await page.goto('/login');
      await page.fill('[name="email"]', 'e2e-analytics-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
    });

    test('should display teacher analytics dashboard', async ({ page }) => {
      await page.goto('/teacher/dashboard');
      
      // Should show key metrics
      await expect(page.locator('[data-testid="total-students"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-projects"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-assessments"]')).toBeVisible();
      
      // Should show progress charts
      await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="skills-distribution"]')).toBeVisible();
    });

    test('should show component skills progress', async ({ page }) => {
      await page.goto('/teacher/dashboard');
      
      // Click on component skills progress
      await page.click('button:has-text("Component Skills Progress")');
      
      // Should show skills breakdown
      await expect(page.locator('[data-testid="skills-progress-table"]')).toBeVisible();
      await expect(page.locator('.skill-row')).toHaveCount({ min: 1 });
      
      // Should show rubric level distribution
      const skillRow = page.locator('.skill-row').first();
      await expect(skillRow.locator('.emerging-count')).toBeVisible();
      await expect(skillRow.locator('.developing-count')).toBeVisible();
      await expect(skillRow.locator('.proficient-count')).toBeVisible();
      await expect(skillRow.locator('.applying-count')).toBeVisible();
    });

    test('should filter analytics by competency', async ({ page }) => {
      await page.goto('/teacher/dashboard');
      
      // Open competency filter
      await page.click('[data-testid="competency-filter"]');
      await page.selectOption('[data-testid="competency-filter"]', { label: 'Critical Thinking' });
      
      // Charts should update
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
      await expect(page.locator('.filter-indicator')).toContainText('Critical Thinking');
    });

    test('should export analytics data', async ({ page }) => {
      await page.goto('/teacher/dashboard');
      
      // Setup download handler
      const downloadPromise = page.waitForEvent('download');
      
      // Click export
      await page.click('button:has-text("Export Data")');
      
      // Should download CSV
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test.describe('Admin Analytics', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: Login as admin
      await page.goto('/register');
      await page.fill('[name="firstName"]', 'Analytics');
      await page.fill('[name="lastName"]', 'Admin');
      await page.fill('[name="email"]', 'e2e-analytics-admin@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.selectOption('[name="role"]', 'admin');
      await page.selectOption('[name="schoolId"]', { label: testSchool.name });
      await page.click('button[type="submit"]');

      await page.goto('/login');
      await page.fill('[name="email"]', 'e2e-analytics-admin@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
    });

    test('should display system-wide metrics', async ({ page }) => {
      await page.goto('/admin/dashboard');
      
      // Should show system statistics
      await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-teachers"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-students"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-projects-count"]')).toBeVisible();
      
      // Should show trend graphs
      await expect(page.locator('[data-testid="user-growth-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="assessment-completion-chart"]')).toBeVisible();
    });

    test('should show school-level filtering', async ({ page }) => {
      await page.goto('/admin/dashboard');
      
      // School filter should be available
      await expect(page.locator('[data-testid="school-filter"]')).toBeVisible();
      
      // Select specific school
      await page.selectOption('[data-testid="school-filter"]', { label: testSchool.name });
      
      // Metrics should update for selected school
      await expect(page.locator('[data-testid="filtered-school-metrics"]')).toBeVisible();
    });

    test('should export comprehensive report', async ({ page }) => {
      await page.goto('/admin/dashboard');
      
      // Setup download handler
      const downloadPromise = page.waitForEvent('download');
      
      // Click comprehensive export
      await page.click('button:has-text("Export Comprehensive Report")');
      
      // Should download detailed report
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('comprehensive');
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test.describe('Performance Analytics', () => {
    test('should show assessment completion rates', async ({ page }) => {
      // Login as teacher
      await page.goto('/login');
      await page.fill('[name="email"]', 'e2e-analytics-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      
      await page.goto('/teacher/dashboard');
      
      // Should show completion rate metrics
      await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
      
      const completionRate = page.locator('[data-testid="completion-rate"]');
      const rateText = await completionRate.textContent();
      expect(rateText).toMatch(/\d+%/); // Should show percentage
    });

    test('should display interactive charts', async ({ page }) => {
      // Login as teacher
      await page.goto('/login');
      await page.fill('[name="email"]', 'e2e-analytics-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');
      
      await page.goto('/teacher/dashboard');
      
      // Charts should be interactive
      const chart = page.locator('[data-testid="progress-chart"]');
      await expect(chart).toBeVisible();
      
      // Hover should show tooltip
      await chart.hover();
      await expect(page.locator('.chart-tooltip')).toBeVisible();
      
      // Charts should be responsive
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(chart).toBeVisible();
    });
  });
});