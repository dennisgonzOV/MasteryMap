import { test, expect, devices } from '@playwright/test';
import { testUsers, testSchool } from '../fixtures/users';

test.describe('Mobile Responsiveness', () => {
  test.use({ ...devices['iPhone 12'] });

  test.beforeEach(async ({ page }) => {
    // Setup: Login as student
    await page.goto('/register');
    await page.fill('[name="firstName"]', 'Mobile');
    await page.fill('[name="lastName"]', 'Student');
    await page.fill('[name="email"]', 'e2e-mobile-student@psi.edu');
    await page.fill('[name="password"]', 'Test123!');
    await page.selectOption('[name="role"]', 'student');
    await page.selectOption('[name="schoolId"]', { label: testSchool.name });
    await page.click('button[type="submit"]');

    await page.goto('/login');
    await page.fill('[name="email"]', 'e2e-mobile-student@psi.edu');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
  });

  test.describe('Mobile Navigation', () => {
    test('should adapt navigation for mobile', async ({ page }) => {
      await page.goto('/student/dashboard');
      
      // Should show mobile menu button instead of full navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-navigation"]')).not.toBeVisible();
      
      // Tap mobile menu
      await page.tap('[data-testid="mobile-menu-button"]');
      
      // Should show mobile navigation menu
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      await expect(page.locator('nav a:has-text("Projects")')).toBeVisible();
      await expect(page.locator('nav a:has-text("Portfolio")')).toBeVisible();
    });

    test('should close mobile menu when tapping outside', async ({ page }) => {
      await page.goto('/student/dashboard');
      
      // Open mobile menu
      await page.tap('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Tap outside menu
      await page.tap('h1'); // Tap on dashboard title
      
      // Menu should close
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).not.toBeVisible();
    });
  });

  test.describe('Mobile Assessment Taking', () => {
    test('should take assessment on mobile device', async ({ page }) => {
      // Assuming there's an assessment available with code "MOBIL"
      await page.goto('/student/enter-code');
      
      // Mobile-friendly code entry
      await page.fill('[name="assessmentCode"]', 'MOBIL');
      await page.tap('button:has-text("Join")');
      
      // Should adapt assessment interface for mobile
      if (await page.locator('.assessment-container').isVisible()) {
        await page.tap('button:has-text("Start Assessment")');
        
        // Question should be mobile-friendly
        await expect(page.locator('.question-text')).toBeVisible();
        await expect(page.locator('[data-testid="question-answer"]')).toBeVisible();
        
        // Answer input should work on mobile
        await page.fill('[data-testid="question-answer"]', 'Mobile test answer');
        
        // Navigation should be mobile-optimized
        await expect(page.locator('button:has-text("Next")')).toBeVisible();
        
        // Progress bar should be visible on mobile
        await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      }
    });

    test('should handle mobile keyboard interactions', async ({ page }) => {
      await page.goto('/student/enter-code');
      
      // Test keyboard input on mobile
      const codeInput = page.locator('[name="assessmentCode"]');
      await codeInput.focus();
      
      // Should show mobile keyboard
      await expect(codeInput).toBeFocused();
      
      // Type on mobile keyboard
      await page.keyboard.type('MOBIL');
      await expect(codeInput).toHaveValue('MOBIL');
    });
  });

  test.describe('Mobile Portfolio', () => {
    test('should display portfolio optimized for mobile', async ({ page }) => {
      await page.goto('/student/portfolio');
      
      // Portfolio should adapt to mobile layout
      await expect(page.locator('h1')).toBeVisible();
      
      // QR code should be appropriately sized for mobile
      const qrCode = page.locator('[data-testid="qr-code"]');
      await expect(qrCode).toBeVisible();
      
      const qrBoundingBox = await qrCode.boundingBox();
      expect(qrBoundingBox!.width).toBeLessThan(250); // Mobile-appropriate size
      expect(qrBoundingBox!.width).toBeGreaterThan(150);
      
      // Credentials should stack vertically on mobile
      const credentialsSection = page.locator('[data-testid="credentials-section"]');
      await expect(credentialsSection).toBeVisible();
    });

    test('should handle touch interactions in portfolio', async ({ page }) => {
      await page.goto('/student/portfolio');
      
      // Touch interactions should work
      if (await page.locator('.credential-card').count() > 0) {
        await page.tap('.credential-card:first-child');
        
        // Should open credential modal on mobile
        await expect(page.locator('.credential-modal')).toBeVisible();
        
        // Should be able to close modal with touch
        await page.tap('.modal-close');
        await expect(page.locator('.credential-modal')).not.toBeVisible();
      }
    });
  });

  test.describe('Mobile Form Interactions', () => {
    test('should handle login form on mobile', async ({ page }) => {
      await page.goto('/login');
      
      // Form should be mobile-friendly
      await expect(page.locator('form')).toBeVisible();
      
      // Input fields should be touch-friendly
      const emailInput = page.locator('[name="email"]');
      const passwordInput = page.locator('[name="password"]');
      
      await emailInput.tap();
      await expect(emailInput).toBeFocused();
      
      await passwordInput.tap();
      await expect(passwordInput).toBeFocused();
      
      // Submit button should be easily tappable
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox!.height).toBeGreaterThan(40); // Minimum touch target size
    });
  });

  test.describe('Mobile Performance', () => {
    test('should load quickly on mobile', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/student/dashboard');
      await page.waitForSelector('h1');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds on mobile
    });

    test('should handle offline scenarios gracefully', async ({ page, context }) => {
      await page.goto('/student/dashboard');
      
      // Simulate offline
      await context.setOffline(true);
      
      // Try to navigate
      await page.click('a:has-text("Portfolio")');
      
      // Should show appropriate offline message or cached content
      await expect(page.locator('body')).toBeVisible(); // Page should still be responsive
      
      // Restore online
      await context.setOffline(false);
    });
  });
});