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
    // Laptop resolution: 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });
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

    // Screenshot 1: 01-main-navigation-with-exams.png
    const shot1 = path.join(docsDir, '01-main-navigation-with-exams.png');
    await page.screenshot({ path: shot1 });

    // 2. Click the navigation entry itself
    await examsNav.click();

    // 3. Verify Exam Builder Page is loaded and visible
    const examBuilderPage = page.locator('[data-testid="page-exam-builder"]');
    await expect(examBuilderPage).toBeVisible({ timeout: 10000 });

    // Tab: Builder
    const builderTab = page.locator('[data-testid="tab-exam-builder"]');
    await expect(builderTab).toBeVisible();
    await builderTab.click();

    // Screenshot 2: 02-exam-builder-top.png
    const shot2 = path.join(docsDir, '02-exam-builder-top.png');
    await page.screenshot({ path: shot2 });

    // Verify Blueprint input fields exist
    const titleInput = page.locator('[data-testid="input-exam-title"]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('اختبار تجريبي في الهندسة المستوية');

    // Test Vertical Scroll at laptop resolution (1366x768):
    // The bottom controls (AI button, confirm exam button) are below initial fold.
    const generateAiBtn = page.locator('[data-testid="btn-generate-ai"]');
    const runAssemblyBtn = page.locator('[data-testid="btn-run-assembly"]');
    const addSampleBtn = page.locator('[data-testid="btn-add-sample-question"]');

    // Scroll bottom controls into view and interact
    await generateAiBtn.scrollIntoViewIfNeeded();
    await expect(generateAiBtn).toBeVisible();

    // Add sample question containing square-root math expression
    await addSampleBtn.scrollIntoViewIfNeeded();
    await expect(addSampleBtn).toBeVisible();
    await addSampleBtn.click();

    // Verify staged question appeared and is scrollable
    const stagedQuestion = page.locator('[data-testid="staged-question-0"]');
    await stagedQuestion.scrollIntoViewIfNeeded();
    await expect(stagedQuestion).toBeVisible();

    // Screenshot 3: 03-exam-builder-scrolled-bottom.png
    const shot3 = path.join(docsDir, '03-exam-builder-scrolled-bottom.png');
    await page.screenshot({ path: shot3 });

    // Confirm and save exam
    const confirmExamBtn = page.locator('[data-testid="btn-confirm-exam"]');
    await confirmExamBtn.scrollIntoViewIfNeeded();
    await expect(confirmExamBtn).toBeVisible();
    await confirmExamBtn.click();

    // 4. Verify preview tab opens with A4 document preview
    const a4Preview = page.locator('[data-testid="a4-document-preview"]');
    await expect(a4Preview).toBeVisible({ timeout: 15000 });

    // Verify KaTeX math rendered inside A4 preview
    const katexEl = a4Preview.locator('.katex');
    await expect(katexEl.first()).toBeVisible({ timeout: 10000 });

    // Verify raw LaTeX \sqrt is NOT visible in rendered document
    const a4Text = await a4Preview.innerText();
    expect(a4Text).not.toContain('\\sqrt');

    // Test variant switching A/B/C/D
    const versionBtnB = page.locator('[data-testid="version-btn-B"]');
    if (await versionBtnB.isVisible()) {
      await versionBtnB.click();
      await expect(a4Preview).toBeVisible();
    }

    // Test kind switching: Teacher / Answer Key
    const teacherBtn = page.locator('[data-testid="kind-teacher-btn"]');
    await teacherBtn.click();
    await expect(a4Preview).toBeVisible();

    const studentBtn = page.locator('[data-testid="kind-student-btn"]');
    await studentBtn.click();
    await expect(a4Preview).toBeVisible();

    // Screenshot 5: 05-exam-a4-preview-rendered-math.png
    const shot5 = path.join(docsDir, '05-exam-a4-preview-rendered-math.png');
    await page.screenshot({ path: shot5 });

    // 5. Switch to List tab and verify localized 'معتمد' badge
    const listTab = page.locator('[data-testid="tab-exam-list"]');
    await expect(listTab).toBeVisible();
    await listTab.click();

    // Verify localized status badge
    const examCards = page.locator('[data-testid^="exam-card-"]');
    await expect(examCards.first()).toBeVisible({ timeout: 10000 });
    await expect(examCards.first()).toContainText('معتمد');

    // Screenshot 4: 04-exam-list-overview.png
    const shot4 = path.join(docsDir, '04-exam-list-overview.png');
    await page.screenshot({ path: shot4 });

    // 6. Test Dark Mode & Scrolled Exam Builder View
    const themeToggleBtn = page.locator('[data-testid="topbar-theme-toggle-btn"]');
    if (await themeToggleBtn.isVisible()) {
      await themeToggleBtn.click();
      await page.waitForTimeout(500);
    }

    // Switch back to builder tab in dark mode
    await builderTab.click();
    await confirmExamBtn.scrollIntoViewIfNeeded();

    // Screenshot 6: 06-exam-builder-dark-mode-scrolled.png
    const shot6 = path.join(docsDir, '06-exam-builder-dark-mode-scrolled.png');
    await page.screenshot({ path: shot6 });
  });
});
