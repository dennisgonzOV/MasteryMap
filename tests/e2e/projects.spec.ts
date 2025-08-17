import { test, expect } from '@playwright/test';
import { testUsers, testSchool } from '../fixtures/users';
import { testProject } from '../fixtures/projects';

test.describe('Project Management Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login as teacher
    await page.goto('/register');
    await page.fill('[name="username"]', 'e2e-project-teacher');
    await page.fill('[name="password"]', 'Test123!');
    await page.selectOption('[name="role"]', 'teacher');
    await page.selectOption('[name="schoolId"]', { label: testSchool.name });
    await page.click('button[type="submit"]');

    // Login
    await page.goto('/login');
    await page.fill('[name="username"]', 'e2e-project-teacher');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
  });

  test.describe('Project Creation', () => {
    test('should create project with component skills', async ({ page }) => {
      await page.goto('/teacher/projects');
      
      // Click Create New Project
      await page.click('button:has-text("Create New Project")');
      
      // Fill project details
      await page.fill('[name="title"]', testProject.title);
      await page.fill('[name="description"]', testProject.description);
      
      // Set dates
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      await page.fill('[name="startDate"]', tomorrow.toISOString().split('T')[0]);
      await page.fill('[name="dueDate"]', dueDate.toISOString().split('T')[0]);
      
      // Select component skills
      await page.click('[data-testid="competency-selector"]');
      
      // Expand Critical Thinking competency
      await page.click('text="Critical Thinking"');
      await page.check('text="Evaluate Sources and Evidence"');
      await page.check('text="Draw Conclusions"');
      
      // Expand Communication competency
      await page.click('text="Communication"');
      await page.check('text="Present Complex Information"');
      
      // Enable AI generation
      await page.check('[name="generateMilestonesAndAssessments"]');
      
      // Create project
      await page.click('button:has-text("Create Project")');
      
      // Wait for AI generation
      await expect(page.locator('.loading-spinner')).toBeVisible();
      await expect(page.locator('.loading-spinner')).not.toBeVisible({ timeout: 10000 });
      
      // Should show generated milestones
      await expect(page.locator('[data-testid="generated-milestones"]')).toBeVisible();
      await expect(page.locator('.milestone-item')).toHaveCount({ min: 3, max: 6 });
      
      // Confirm creation
      await page.click('button:has-text("Confirm and Create")');
      
      // Should redirect to projects list
      await expect(page).toHaveURL('/teacher/projects');
      await expect(page.locator('.project-card')).toContainText(testProject.title);
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/teacher/projects');
      await page.click('button:has-text("Create New Project")');
      
      // Try to submit without title
      await page.click('button:has-text("Create Project")');
      
      await expect(page.locator('.error-message')).toContainText('title');
    });
  });

  test.describe('Team Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create a project first
      await page.goto('/teacher/projects');
      await page.click('button:has-text("Create New Project")');
      await page.fill('[name="title"]', 'Team Test Project');
      await page.fill('[name="description"]', 'Project for testing team functionality');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      await page.fill('[name="startDate"]', tomorrow.toISOString().split('T')[0]);
      await page.fill('[name="dueDate"]', dueDate.toISOString().split('T')[0]);
      
      await page.click('button:has-text("Create Project")');
      await page.waitForSelector('.project-card');
    });

    test('should create and manage teams', async ({ page }) => {
      // Click on the project
      await page.click('.project-card:has-text("Team Test Project")');
      
      // Click Manage Project
      await page.click('button:has-text("Manage Project")');
      
      // Create team
      await page.click('button:has-text("Create Team")');
      await page.fill('[name="teamName"]', 'Green Innovators');
      
      // Add students (assuming some exist in the system)
      const studentCheckboxes = await page.locator('[data-testid="student-checkbox"]').count();
      if (studentCheckboxes > 0) {
        await page.check('[data-testid="student-checkbox"]');
      }
      
      await page.click('button:has-text("Create Team")');
      
      // Verify team appears
      await expect(page.locator('.team-card')).toContainText('Green Innovators');
    });
  });

  test.describe('AI Milestone Generation', () => {
    test('should generate relevant milestones', async ({ page }) => {
      await page.goto('/teacher/projects');
      await page.click('button:has-text("Create New Project")');
      
      await page.fill('[name="title"]', 'AI Test Project');
      await page.fill('[name="description"]', 'Testing AI milestone generation capabilities');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 21); // 3 weeks
      
      await page.fill('[name="startDate"]', tomorrow.toISOString().split('T')[0]);
      await page.fill('[name="dueDate"]', dueDate.toISOString().split('T')[0]);
      
      // Select skills for AI context
      await page.click('[data-testid="competency-selector"]');
      await page.click('text="Critical Thinking"');
      await page.check('text="Evaluate Sources and Evidence"');
      
      await page.check('[name="generateMilestonesAndAssessments"]');
      await page.click('button:has-text("Create Project")');
      
      // Wait for AI generation
      await page.waitForSelector('[data-testid="generated-milestones"]', { timeout: 10000 });
      
      // Verify milestone structure
      const milestones = page.locator('.milestone-item');
      await expect(milestones).toHaveCount({ min: 3, max: 6 });
      
      // Check each milestone has required fields
      const firstMilestone = milestones.first();
      await expect(firstMilestone.locator('.milestone-title')).not.toBeEmpty();
      await expect(firstMilestone.locator('.milestone-description')).not.toBeEmpty();
      await expect(firstMilestone.locator('.milestone-due-date')).not.toBeEmpty();
      
      // Verify dates are between project start and end
      const milestoneDueDateText = await firstMilestone.locator('.milestone-due-date').textContent();
      const milestoneDueDate = new Date(milestoneDueDateText!);
      
      expect(milestoneDueDate).toBeGreaterThan(tomorrow);
      expect(milestoneDueDate).toBeLessThan(dueDate);
    });
  });
});