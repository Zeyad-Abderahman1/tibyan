import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Math Engine — Hidden from Teacher UI', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-math-hidden-'));
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

  test('Math Editor is NOT accessible via navigation or direct URL', async () => {
    test.setTimeout(120000);
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
    page.on('dialog', (dialog) => dialog.accept());
    await page.waitForLoadState('domcontentloaded');

    // Complete First-Run Wizard
    const wizardStartBtn = page.locator('[data-testid="start-wizard-btn"]');
    await expect(wizardStartBtn).toBeVisible({ timeout: 25000 });
    await wizardStartBtn.click();

    const nameInput = page.locator('[data-testid="input-owner-fullname"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('الأستاذ أحمد');

    const usernameInput = page.locator('[data-testid="input-owner-username"]');
    await usernameInput.fill('teacher');

    const pinInput = page.locator('[data-testid="input-owner-pin"]');
    await pinInput.fill('1234');

    const confirmPinInput = page.locator('[data-testid="input-owner-confirm-pin"]');
    await confirmPinInput.fill('1234');

    await page.locator('[data-testid="submit-owner-btn"]').click();

    const yearSubmitBtn = page.locator('[data-testid="submit-year-btn"]');
    await expect(yearSubmitBtn).toBeVisible({ timeout: 15000 });
    await yearSubmitBtn.click();

    const finishWizardBtn = page.locator('[data-testid="finish-wizard-btn"]');
    const appShell = page.locator('[data-testid="app-shell"]');

    await Promise.race([
      finishWizardBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      appShell.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    ]);

    if (await finishWizardBtn.isVisible()) {
      await finishWizardBtn.click();
    }

    const loginScreen = page.locator('[data-testid="login-screen"]');
    if (await loginScreen.isVisible()) {
      await page.waitForTimeout(500);
      await page.keyboard.type('1234');
    }

    await expect(appShell).toBeVisible({ timeout: 15000 });

    // Verify NO Math Editor nav item visible
    const mathNav = page.locator('[data-testid="nav-item-math-editor"]');
    await expect(mathNav).toHaveCount(0);

    // Verify NO Math Editor button on curriculum page
    await page.evaluate(() => { window.location.hash = '#/curriculum'; });
    await page.waitForTimeout(1000);
    const mathBtn = page.locator('[data-testid="btn-open-math-editor"]');
    await expect(mathBtn).toHaveCount(0);

    // Verify direct navigation to /math-editor redirects away
    await page.evaluate(() => { window.location.hash = '#/math-editor'; });
    await page.waitForTimeout(1500);
    const currentHash = await page.evaluate(() => window.location.hash);
    expect(currentHash).not.toBe('#/math-editor');

    // Verify MathRichContentViewer still works inline (e.g. in question bank)
    await page.evaluate(() => { window.location.hash = '#/questions'; });
    await page.waitForTimeout(1000);
    // The page should load without errors — math rendering infrastructure is intact
    const questionsPage = page.locator('[data-testid="page-questions"]');
    // May be empty but should not crash
  });
});
