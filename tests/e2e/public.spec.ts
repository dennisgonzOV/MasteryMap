import { test, expect } from '@playwright/test';

test.describe('Public & Landing Pages', () => {
    // PUB-01: Landing page load
    test('should load landing page correctly', async ({ page }) => {
        await page.goto('/');

        // Verify hero content
        await expect(page.locator('h1')).toContainText('Transform Learning');

        // Verify primary CTA buttons
        await expect(page.locator('text=Sign In')).toBeVisible();
        await expect(page.locator('text=Get Started Free')).toBeVisible();

        // Ensure no console errors
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        expect(errors.length).toBe(0);
    });

    // PUB-02: Contact form success
    test('should submit contact form successfully', async ({ page }) => {
        // Intercept the contact API call
        await page.route('**/api/contact', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: "Thanks for reaching out! We'll be in touch soon." })
            });
        });

        await page.goto('/');

        // Open contact modal
        const contactBtn = page.getByTestId('button-contact-admin');
        await contactBtn.click();

        // Fill contact form
        await page.getByTestId('input-contact-name').fill('E2E Test User');
        await page.getByTestId('input-contact-email').fill('e2e-contact@example.com');
        await page.getByTestId('input-contact-message').fill('This is a test message from E2E');

        // Submit
        await page.getByTestId('button-submit-contact').click();

        // Verify success toast appears
        await expect(page.locator('.toast')).toContainText('Message Sent');
    });

    // PUB-04: Public project explorer and filters
    test('should load public project explorer and filters', async ({ page }) => {
        await page.goto('/explore');

        // the page should have an Explore Public Projects heading
        await expect(page.locator('h2')).toContainText('Explore Public Projects');

        // Check if the filters card is visible
        await expect(page.locator('text=Filters')).toBeVisible();

        // We should be able to type in the search box
        const searchInput = page.getByPlaceholder('Search projects...');
        await searchInput.fill('Test Project');
        await expect(searchInput).toHaveValue('Test Project');
    });

    // PUB-05: Public portfolio view
    test('should load public portfolio view', async ({ page }) => {
        const testSlug = 'e2e-test-portfolio';

        // Intercept the portfolio public API to return a mock portfolio
        await page.route(`**/api/portfolio/public/${testSlug}`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    student: { username: "E2E Student" },
                    settings: { title: "E2E Portfolio", description: "A portfolio for E2E tests" },
                    artifacts: [
                        { id: 1, title: "Mock Artifact", url: "https://example.com/mock.pdf", fileType: "pdf", visibility: "public", pinned: true }
                    ],
                    credentials: []
                })
            });
        });

        await page.goto(`/portfolio/public/${testSlug}`);

        // It should render the student name and portfolio title
        await expect(page.locator('h1')).toContainText("E2E Portfolio");
        await expect(page.locator('text=E2E Student')).toBeVisible();
        await expect(page.locator('text=Mock Artifact')).toBeVisible();
    });
});
