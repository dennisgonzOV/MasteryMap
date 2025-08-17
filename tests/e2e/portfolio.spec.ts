import { test, expect } from '@playwright/test';
import { testUsers, testSchool } from '../fixtures/users';

test.describe('Digital Portfolio Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Register and login student with some achievements
    await page.goto('/register');
    await page.fill('[name="username"]', 'e2e-portfolio-student');
    await page.fill('[name="password"]', 'Test123!');
    await page.selectOption('[name="role"]', 'student');
    await page.selectOption('[name="schoolId"]', { label: testSchool.name });
    await page.click('button[type="submit"]');

    await page.goto('/login');
    await page.fill('[name="username"]', 'e2e-portfolio-student');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
  });

  test.describe('Portfolio Generation', () => {
    test('should display portfolio with artifacts and credentials', async ({ page }) => {
      await page.goto('/student/portfolio');
      
      // Should show portfolio structure
      await expect(page.locator('h1')).toContainText('Digital Portfolio');
      await expect(page.locator('[data-testid="artifacts-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="credentials-section"]')).toBeVisible();
      
      // Should show QR code
      await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
      
      // Should show portfolio URL
      await expect(page.locator('[data-testid="portfolio-url"]')).toBeVisible();
    });

    test('should generate and display QR code', async ({ page }) => {
      await page.goto('/student/portfolio');
      
      // QR code should be visible
      const qrCode = page.locator('[data-testid="qr-code"] img');
      await expect(qrCode).toBeVisible();
      
      // QR code should have valid src
      const qrSrc = await qrCode.getAttribute('src');
      expect(qrSrc).toContain('data:image');
    });
  });

  test.describe('Public Portfolio Access', () => {
    test('should access public portfolio without authentication', async ({ page, context }) => {
      // Get portfolio URL from student view
      await page.goto('/student/portfolio');
      const portfolioLink = page.locator('[data-testid="portfolio-url"]');
      const portfolioUrl = await portfolioLink.getAttribute('href');
      
      // Open in new incognito context (no authentication)
      const incognitoContext = await context.browser()!.newContext();
      const publicPage = await incognitoContext.newPage();
      
      await publicPage.goto(portfolioUrl!);
      
      // Should show public portfolio
      await expect(publicPage.locator('h1')).toContainText('Portfolio');
      await expect(publicPage.locator('.student-name')).toContainText('e2e-portfolio-student');
      
      // Should be read-only (no edit buttons)
      await expect(publicPage.locator('button:has-text("Edit")')).not.toBeVisible();
      
      // Should show artifacts and credentials
      await expect(publicPage.locator('[data-testid="public-artifacts"]')).toBeVisible();
      await expect(publicPage.locator('[data-testid="public-credentials"]')).toBeVisible();
      
      await incognitoContext.close();
    });
  });

  test.describe('Portfolio Sharing', () => {
    test('should copy portfolio link', async ({ page }) => {
      await page.goto('/student/portfolio');
      
      // Click copy link button
      await page.click('button:has-text("Copy Portfolio Link")');
      
      // Should show success message
      await expect(page.locator('.toast')).toContainText('Link copied');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display portfolio correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/student/portfolio');
      
      // Should adapt to mobile layout
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
      
      // QR code should be appropriately sized
      const qrCode = page.locator('[data-testid="qr-code"]');
      const qrBoundingBox = await qrCode.boundingBox();
      expect(qrBoundingBox!.width).toBeLessThan(300); // Reasonable mobile size
      expect(qrBoundingBox!.width).toBeGreaterThan(150);
    });
  });

  test.describe('Credential Display', () => {
    test('should show earned credentials with details', async ({ page }) => {
      await page.goto('/student/portfolio');
      
      // Check credentials section
      const credentialsSection = page.locator('[data-testid="credentials-section"]');
      await expect(credentialsSection).toBeVisible();
      
      // If credentials exist, check their structure
      const credentialCards = page.locator('.credential-card');
      const credentialCount = await credentialCards.count();
      
      if (credentialCount > 0) {
        const firstCredential = credentialCards.first();
        await expect(firstCredential.locator('.credential-type')).toBeVisible();
        await expect(firstCredential.locator('.credential-name')).toBeVisible();
        await expect(firstCredential.locator('.earned-date')).toBeVisible();
        
        // Click credential for details
        await firstCredential.click();
        await expect(page.locator('.credential-modal')).toBeVisible();
        await expect(page.locator('.credential-description')).toBeVisible();
      }
    });
  });
});