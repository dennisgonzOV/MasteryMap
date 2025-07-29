import { test, expect } from '@playwright/test';
import { testUsers, testSchool } from '../fixtures/users';

test.describe('Authentication Workflows', () => {
  test.describe('User Registration', () => {
    test('should register new teacher successfully', async ({ page }) => {
      await page.goto('/register');

      // Fill registration form
      await page.fill('[name="firstName"]', testUsers.newTeacher.firstName);
      await page.fill('[name="lastName"]', testUsers.newTeacher.lastName);
      await page.fill('[name="email"]', `e2e-${testUsers.newTeacher.email}`);
      await page.fill('[name="password"]', testUsers.newTeacher.password);
      
      // Select role and school
      await page.selectOption('[name="role"]', 'teacher');
      await page.selectOption('[name="schoolId"]', { label: testSchool.name });
      
      // Submit registration
      await page.click('button[type="submit"]');

      // Should redirect to login with success message
      await expect(page).toHaveURL('/login');
      await expect(page.locator('.toast')).toContainText('Registration successful');
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/register');

      await page.fill('[name="email"]', 'invalid-email');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('.text-red-500')).toContainText('email');
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');

      await page.fill('[name="email"]', 'test@example.com');
      await page.fill('[name="password"]', '123');
      await page.click('button[type="submit"]');

      await expect(page.locator('.text-red-500')).toContainText('password');
    });
  });

  test.describe('User Login', () => {
    test.beforeEach(async ({ page }) => {
      // Register a user first
      await page.goto('/register');
      await page.fill('[name="firstName"]', 'Test');
      await page.fill('[name="lastName"]', 'Teacher');
      await page.fill('[name="email"]', 'e2e-login-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.selectOption('[name="role"]', 'teacher');
      await page.selectOption('[name="schoolId"]', { label: testSchool.name });
      await page.click('button[type="submit"]');
    });

    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[name="email"]', 'e2e-login-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');

      // Should redirect to teacher dashboard
      await expect(page).toHaveURL('/teacher/dashboard');
      await expect(page.locator('h1')).toContainText('Teacher Dashboard');
      await expect(page.locator('[data-testid="user-name"]')).toContainText('Test Teacher');
    });

    test('should reject invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[name="email"]', 'e2e-login-teacher@psi.edu');
      await page.fill('[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      await expect(page.locator('.toast')).toContainText('Invalid credentials');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Role-Based Access', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/teacher/dashboard');
      await expect(page).toHaveURL('/login');
    });

    test('should show role-appropriate navigation', async ({ page }) => {
      // Login as teacher
      await page.goto('/login');
      await page.fill('[name="email"]', 'e2e-login-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');

      // Check teacher navigation
      await expect(page.locator('nav')).toContainText('Projects');
      await expect(page.locator('nav')).toContainText('Assessments');
      await expect(page.locator('nav')).not.toContainText('Admin');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('[name="email"]', 'e2e-login-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');

      // Refresh page
      await page.reload();

      // Should still be authenticated
      await expect(page).toHaveURL('/teacher/dashboard');
      await expect(page.locator('h1')).toContainText('Teacher Dashboard');
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[name="email"]', 'e2e-login-teacher@psi.edu');
      await page.fill('[name="password"]', 'Test123!');
      await page.click('button[type="submit"]');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Should redirect to landing page
      await expect(page).toHaveURL('/');
      
      // Try to access protected route
      await page.goto('/teacher/dashboard');
      await expect(page).toHaveURL('/login');
    });
  });
});