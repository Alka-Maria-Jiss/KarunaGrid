import { test, expect } from '@playwright/test';

test.describe('KarunaGrid End-to-End User Workflows', () => {

  test.beforeEach(async ({ page }) => {
    // Clear tokens before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('Workflow 1: Landing Page & Portal Navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check main branding and hero elements
    await expect(page).toHaveTitle(/KarunaGrid/i);
    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('KarunaGrid');

    // Verify navigation button exists
    const signInBtn = page.getByRole('button', { name: /Sign In|Login/i }).first();
    await expect(signInBtn).toBeVisible();

    // Click Sign In and verify redirection to login view
    await signInBtn.click();
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Sign In to KarunaGrid/i })).toBeVisible();
  });

  test('Workflow 2: Registration Multi-Step Wizard Flow', async ({ page }) => {
    await page.goto('/register');

    // Step 1: Role Selection & Header
    await expect(page.getByText(/Account Registration/i)).toBeVisible();
    await expect(page.getByText(/Step 1 of 4/i)).toBeVisible();
    
    // Select Patient role card
    const patientRoleCard = page.getByText('Patient Portal').first();
    await expect(patientRoleCard).toBeVisible();
    await patientRoleCard.click();

    // Proceed to Step 2
    const continueBtn = page.getByRole('button', { name: /Continue to Personal Details/i });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Step 2: Personal Details Form
    await expect(page.getByText(/Step 2 of 4/i)).toBeVisible();
    
    const nameInput = page.locator('input[placeholder*="Thomas" i], input[id*="name" i], input[type="text"]').first();
    await expect(nameInput).toBeVisible();

    // Fill form fields
    const testTimestamp = Date.now();
    await nameInput.fill('Anand Joseph');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(`patient_test_${testTimestamp}@example.com`);

    const phoneInput = page.locator('input[placeholder*="9847" i], input[type="tel"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('9847123456');
    }

    const passwordInputs = page.locator('input[type="password"]');
    if (await passwordInputs.count() >= 2) {
      await passwordInputs.nth(0).fill('Patient@123');
      await passwordInputs.nth(1).fill('Patient@123');
    }

    // Step navigation button is clickable
    const nextStepBtn = page.getByRole('button', { name: /Continue to Address Details|Next/i });
    await expect(nextStepBtn).toBeVisible();
    await expect(nextStepBtn).toBeEnabled();
  });

  test('Workflow 3: Doctor Authentication & Session Storage', async ({ page }) => {
    await page.goto('/login');

    // 1. Fill Doctor credentials
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill('doctor@karunagrid.org');
    await passwordInput.fill('Doctor@123');

    // 2. Submit Login form
    const loginButton = page.getByRole('button', { name: /Sign In|Log In/i }).first();
    await loginButton.click();

    // 3. Verify URL redirected to doctor dashboard
    await page.waitForURL('**/dashboard/doctor', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard/doctor');

    // 4. Verify LocalStorage JWT Tokens
    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    const userInfo = await page.evaluate(() => JSON.parse(localStorage.getItem('user_info') || '{}'));

    expect(accessToken).toBeTruthy();
    expect(userInfo.role).toBe('Doctor');
  });

  test('Workflow 4: Doctor Dashboard & Clinical Workspace', async ({ page }) => {
    // Authenticate programmatically as doctor
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('doctor@karunagrid.org');
    await page.locator('input[type="password"]').fill('Doctor@123');
    await page.getByRole('button', { name: /Sign In|Log In/i }).first().click();

    await page.waitForURL('**/dashboard/doctor', { timeout: 15000 });

    // Verify Doctor Clinical Dashboard Header & Sections
    await expect(page.locator('body')).toContainText(/Doctor/i);

    // Check for Clinical Sidebar / Navigation items
    const sidebar = page.locator('aside, nav, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();

    // Verify clinical workspace navigation
    const patientTab = page.getByRole('button', { name: /Patients/i }).first();
    if (await patientTab.isVisible()) {
      await patientTab.click();
      await page.waitForTimeout(1000);
      const content = await page.innerText('body');
      expect(content).toMatch(/Patients|Registry|Medical Profile|Search/i);
    }
  });

  test('Workflow 5: Route Protection & Security Redirection', async ({ page }) => {
    // Attempt accessing doctor dashboard without logging in
    await page.goto('/dashboard/doctor');

    // Should immediately redirect unauthenticated users to /login
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
    await expect(page.getByRole('heading', { name: /Sign In to KarunaGrid/i })).toBeVisible();
  });

  test('Workflow 6: Application Status Inquiry Page', async ({ page }) => {
    await page.goto('/check-application-status');

    await expect(page.getByText(/Application Status/i).first()).toBeVisible();
    const searchInputs = page.locator('input');
    expect(await searchInputs.count()).toBeGreaterThan(0);
  });

});
