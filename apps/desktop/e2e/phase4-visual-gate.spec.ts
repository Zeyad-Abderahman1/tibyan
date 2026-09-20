import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 4 — AI Exam Builder Visible Flow Spec', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../test-results/phase4-visual-gate');
  const docsDir = path.resolve(__dirname, '../../../docs/screenshots/phase4-final');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-phase4-gate-'));
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
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

  test('verifies visible Arabic navigation entry, navigates to Exam Builder, tests flows, and captures screenshots', async () => {
    test.setTimeout(240000);
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
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForLoadState('domcontentloaded');

    // Complete First-Run Wizard
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

    await expect(appShell).toBeVisible({ timeout: 15000 });

    // 1. Verify visible Arabic navigation item for Exams on the main shell
    const examsNav = page.locator('[data-testid="nav-item-exams"]');
    await expect(examsNav).toBeVisible({ timeout: 10000 });
    await expect(examsNav).toContainText('الاختبارات');

    // Screenshot 1: Main navigation with the visible Exams entry on dashboard
    const shot1 = path.join(docsDir, '01-main-navigation-with-exams.png');
    await page.screenshot({ path: shot1, fullPage: true });

    // 2. Click the navigation entry itself
    await examsNav.click();

    // 3. Verify Exam Builder Page is loaded and visible
    const examBuilderPage = page.locator('[data-testid="page-exam-builder"]');
    await expect(examBuilderPage).toBeVisible({ timeout: 10000 });

    // Tab: Builder
    const builderTab = page.locator('[data-testid="tab-exam-builder"]');
    await expect(builderTab).toBeVisible();
    await builderTab.click();

    // Screenshot 2: Exam Builder page with Blueprint settings and AI Generator panel
    const shot2 = path.join(docsDir, '02-exam-builder-workbench.png');
    await page.screenshot({ path: shot2, fullPage: true });

    // Verify Blueprint input fields exist and are visible
    const titleInput = page.locator('[data-testid="input-exam-title"]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('اختبار تجريبي في الهندسة المستوية');

    const runAssemblyBtn = page.locator('[data-testid="btn-run-assembly"]');
    await expect(runAssemblyBtn).toBeVisible();

    const generateAiBtn = page.locator('[data-testid="btn-generate-ai"]');
    await expect(generateAiBtn).toBeVisible();

    // 4. Click sample question button to populate staged placement
    const addSampleBtn = page.locator('[data-testid="btn-add-sample-question"]');
    await expect(addSampleBtn).toBeVisible();
    await addSampleBtn.click();

    // Verify staged placement appears
    const stagedQuestion = page.locator('[data-testid="staged-question-0"]');
    await expect(stagedQuestion).toBeVisible();

    // Confirm and save exam
    const confirmExamBtn = page.locator('[data-testid="btn-confirm-exam"]');
    await expect(confirmExamBtn).toBeVisible();
    await confirmExamBtn.click();

    // Verify preview tab opens with A4 document preview
    const a4Preview = page.locator('[data-testid="a4-document-preview"]');
    await expect(a4Preview).toBeVisible({ timeout: 15000 });

    // Screenshot 4: A4 Live Exam Print Preview
    const shot4 = path.join(docsDir, '04-exam-a4-preview.png');
    await page.screenshot({ path: shot4, fullPage: true });

    // Switch to List tab
    const listTab = page.locator('[data-testid="tab-exam-list"]');
    await expect(listTab).toBeVisible();
    await listTab.click();

    // Screenshot 3: Exam list overview showing newly created exam
    const shot3 = path.join(docsDir, '03-exam-list-overview.png');
    await page.screenshot({ path: shot3, fullPage: true });
  });
});
