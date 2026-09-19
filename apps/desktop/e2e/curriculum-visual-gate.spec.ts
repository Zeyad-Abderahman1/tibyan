import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 3 — Task 1: Curriculum Hierarchy & Visual Gate Spec', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../test-results/curriculum-visual-gate');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-curriculum-gate-'));
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

  test('captures full Curriculum workflow: Catalogs List, Create Modal, Tree View, and Group Syllabus Card', async () => {
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
    await page.waitForLoadState('domcontentloaded');

    // 1. Complete First-Run Wizard
    const wizardStartBtn = page.locator('[data-testid="start-wizard-btn"]');
    await expect(wizardStartBtn).toBeVisible({ timeout: 25000 });
    await wizardStartBtn.click();

    const nameInput = page.locator('[data-testid="input-owner-fullname"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('الأستاذ أحمد الشريف');

    const usernameInput = page.locator('[data-testid="input-owner-username"]');
    await usernameInput.fill('teacher');

    const pinInput = page.locator('[data-testid="input-owner-pin"]');
    await pinInput.fill('1234');

    const confirmPinInput = page.locator('[data-testid="input-owner-confirm-pin"]');
    await confirmPinInput.fill('1234');

    const ownerSubmitBtn = page.locator('[data-testid="submit-owner-btn"]');
    await ownerSubmitBtn.click();

    const yearSubmitBtn = page.locator('[data-testid="submit-year-btn"]');
    await expect(yearSubmitBtn).toBeVisible({ timeout: 15000 });
    await yearSubmitBtn.click();

    const finishWizardBtn = page.locator('[data-testid="finish-wizard-btn"]');
    const initialLoginScreen = page.locator('[data-testid="login-screen"]');
    const appShell = page.locator('[data-testid="app-shell"]');

    await Promise.race([
      finishWizardBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      initialLoginScreen.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      appShell.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    ]);

    if (await finishWizardBtn.isVisible()) {
      await finishWizardBtn.click();
    }

    if (await initialLoginScreen.isVisible()) {
      await page.waitForTimeout(500);
      await page.keyboard.type('1234');
    }

    // App shell loaded
    await expect(appShell).toBeVisible({ timeout: 15000 });

    // 2. Navigate to Curriculum page
    const curriculumNavBtn = page.locator('[data-testid="nav-curriculum"]');
    if (await curriculumNavBtn.isVisible()) {
      await curriculumNavBtn.click();
    } else {
      // Direct navigation
      await page.evaluate(() => {
        window.location.hash = '#/curriculum';
      });
    }

    const curriculumPage = page.locator('[data-testid="page-curriculum"]');
    await expect(curriculumPage).toBeVisible({ timeout: 10000 });

    // Capture 01: Curriculum Catalogs List (Initial / Empty workspace)
    await page.screenshot({
      path: path.join(screenshotsDir, '01-curriculum-catalogs-workspace.png'),
      fullPage: true,
    });

    // 3. Open Create Catalog Modal
    const createBtn = page.locator('[data-testid="btn-create-catalog"]');
    if (await createBtn.isVisible()) {
      await createBtn.click();

      const modal = page.locator('[data-testid="form-create-catalog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Fill in sample data
      await page.locator('[data-testid="input-catalog-code"]').fill('CAT-PREP1-ALG');
      await page.locator('[data-testid="input-catalog-title"]').fill('الجبر والإحصاء - الصف الأول الإعدادي');

      // Capture 02: Create Catalog Modal
      await page.screenshot({
        path: path.join(screenshotsDir, '02-curriculum-create-modal.png'),
        fullPage: true,
      });

      // Submit creation
      await page.locator('[data-testid="btn-submit-create-catalog"]').click();
      await expect(modal).toBeHidden({ timeout: 5000 });
    }

    // Capture 03: Curriculum Tree View / Catalog Workspace
    await page.screenshot({
      path: path.join(screenshotsDir, '03-curriculum-tree-view.png'),
      fullPage: true,
    });

    // 4. Navigate to Groups page to verify Group Syllabus Card integration
    const groupsNavBtn = page.locator('[data-testid="nav-groups"]');
    if (await groupsNavBtn.isVisible()) {
      await groupsNavBtn.click();
    } else {
      await page.evaluate(() => {
        window.location.hash = '#/groups';
      });
    }

    await page.waitForTimeout(1000);

    // Capture 04: Groups Workspace with Syllabus Integration
    await page.screenshot({
      path: path.join(screenshotsDir, '04-group-syllabus-card.png'),
      fullPage: true,
    });
  });
});
