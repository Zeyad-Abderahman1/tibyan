import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Visual Rescue Verification Suite', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = 'C:\\Users\\zeyad mohamed\\.gemini\\antigravity-ide\\brain\\d706cd3a-84a5-4152-b094-7a238e59f5ec\\screenshots';

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-visual-'));
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.afterAll(async () => {
    if (electronApp) {
      try {
        await electronApp.close();
      } catch {}
    }
    if (testDataDir && fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('captures Groups page at 1920x1080 (Light & Dark) and 1366x768 with empty and table states', async () => {
    // 1. Launch App using packaged executable
    const packagedExePath = path.resolve(__dirname, '../release/win-unpacked/تِبيان.exe');
    electronApp = await electron.launch({
      executablePath: packagedExePath,
      args: [`--user-data-dir=${testDataDir}`],
      env: {
        ...process.env,
        TIBYAN_APP_DATA_DIR: testDataDir,
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // 2. Complete First-Run Wizard
    const wizardStartBtn = page.locator('[data-testid="start-wizard-btn"]');
    await expect(wizardStartBtn).toBeVisible({ timeout: 15000 });
    await wizardStartBtn.click();

    // Fill Owner Info
    await page.locator('[data-testid="input-owner-fullname"]').fill('الأستاذ أحمد الشريف');
    await page.locator('[data-testid="input-owner-username"]').fill('teacher');
    await page.locator('[data-testid="input-owner-pin"]').fill('1234');
    await page.locator('[data-testid="input-owner-confirm-pin"]').fill('1234');
    await page.locator('[data-testid="submit-owner-btn"]').click();

    // Submit Academic Year
    const yearSubmitBtn = page.locator('[data-testid="submit-year-btn"]');
    await expect(yearSubmitBtn).toBeVisible({ timeout: 15000 });
    await yearSubmitBtn.click();

    // Finish Wizard
    const finishWizardBtn = page.locator('[data-testid="finish-wizard-btn"]');
    const appShell = page.locator('[data-testid="app-shell"]');
    const loginScreen = page.locator('[data-testid="login-screen"]');

    await Promise.race([
      finishWizardBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      loginScreen.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      appShell.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    ]);

    if (await finishWizardBtn.isVisible()) {
      await finishWizardBtn.click();
    }
    if (await loginScreen.isVisible()) {
      await page.waitForTimeout(500);
      await page.keyboard.type('1234');
    }

    await expect(appShell).toBeVisible({ timeout: 15000 });

    // 3. Navigate to Groups Page
    const groupsNavLink = page.locator('[data-testid="dynamic-island-nav"] a[href*="groups"]');
    await expect(groupsNavLink).toBeVisible();
    await groupsNavLink.click();

    const pageGroups = page.locator('[data-testid="page-groups"]');
    await expect(pageGroups).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    // 4. Viewport: 1920x1080 Light Mode (Empty State)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(400);
    const lightPath1920 = path.join(screenshotsDir, 'groups-1920x1080-light.png');
    await page.screenshot({ path: lightPath1920, fullPage: true });

    // 5. Viewport: 1920x1080 Dark Mode (Empty State)
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(400);
    const darkPath1920 = path.join(screenshotsDir, 'groups-1920x1080-dark.png');
    await page.screenshot({ path: darkPath1920, fullPage: true });

    // 6. Viewport: 1366x768 Dark Mode (Empty State)
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(400);
    const darkPath1366 = path.join(screenshotsDir, 'groups-1366x768-dark.png');
    await page.screenshot({ path: darkPath1366, fullPage: true });

    // 7. Create real group to capture the high-density table view
    await page.setViewportSize({ width: 1920, height: 1080 });
    const createBtn = page.locator('[data-testid="btn-create-group"]');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const groupNameInput = page.locator('[data-testid="input-group-name"]');
      await expect(groupNameInput).toBeVisible({ timeout: 5000 });
      await groupNameInput.fill('مجموعة النخبة — أولى ثانوي (عام)');

      const submitGroupBtn = page.locator('[data-testid="btn-submit-group"]');
      await submitGroupBtn.click();
      await page.waitForTimeout(800);

      // Dark Mode Table View at 1920x1080
      const tableDarkPath = path.join(screenshotsDir, 'groups-1920x1080-table-dark.png');
      await page.screenshot({ path: tableDarkPath, fullPage: true });

      // Light Mode Table View at 1920x1080
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(400);
      const tableLightPath = path.join(screenshotsDir, 'groups-1920x1080-table-light.png');
      await page.screenshot({ path: tableLightPath, fullPage: true });
    }
  });
});
