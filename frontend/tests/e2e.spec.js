import { test, expect } from '@playwright/test';

test.describe('B2B Client Acquisition System E2E', () => {
    const baseUrl = 'http://localhost:5173';

    test('User can visit landing page and see plans', async ({ page }) => {
        await page.goto(baseUrl);
        await expect(page).toHaveTitle(/B2B Client Acquisition/);

        // Verify pricing section
        const pricingHeader = page.locator('h2:has-text("Planes")');
        await expect(pricingHeader).toBeVisible();
    });

    test('Complete Flow: Login to Search', async ({ page }) => {
        await page.goto(`${baseUrl}/login`);

        // Perform mock login
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Ingresar")');

        // Should be redirected to dashboard
        await expect(page).toHaveURL(/.*dashboard/);

        // Trigger a search
        await page.fill('input[placeholder*="Ej: Restaurantes"]', 'Hoteles');
        await page.fill('input[placeholder*="Ciudad"]', 'Madrid');
        await page.click('button:has-text("Buscar")');

        // Check for results table or progress bar
        const table = page.locator('table');
        await expect(table).toBeVisible();
    });
});
