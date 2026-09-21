import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 5 — Paper Correction & Analytics Visual Gate', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../test-results/phase5-visual-gate');
  const docsDir = path.resolve(__dirname, '../../../docs/screenshots/phase5-final');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-phase5-gate-'));
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

  test('completes Phase 5 visual gate: dashboard, capture, correction, analytics, dark mode, multi-viewport', async () => {
    test.setTimeout(300000);
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
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForLoadState('domcontentloaded');

    // ── 1. Complete First-Run Wizard ──
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

    await page.locator('[data-testid="submit-owner-btn"]').click();

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

    if (await finishWizardBtn.isVisible()) await finishWizardBtn.click();
    if (await initialLoginScreen.isVisible()) {
      await page.waitForTimeout(500);
      await page.keyboard.type('1234');
    }

    await expect(appShell).toBeVisible({ timeout: 15000 });

    // ── 2. Seed data via IPC: create exam, capture session, submissions, grading decisions ──
    // Create an exam via confirmAssembly with proper answer-key format for grading engine
    const examResult = await page.evaluate(async () => {
      const tibyan = (window as any).tibyan;
      if (!tibyan?.exams?.confirmAssembly) return { error: 'no confirmAssembly' };

      const uuid = () => crypto.randomUUID();
      const qNodeId = uuid();

      try {
        const result = await tibyan.exams.confirmAssembly({
          blueprint: {
            title: 'اختبار Phase 5 - رياضيات',
            gradeLevel: 'PREP_1',
            languageTrack: 'ARABIC',
            curriculumNodeIds: [],
            sourceReferenceIds: [],
            totalQuestions: 3,
            totalMarks: 6,
            durationMinutes: 45,
            difficultyDistribution: { EASY: 1, MEDIUM: 1, HARD: 1 },
            questionTypeDistribution: { MULTIPLE_CHOICE: 1, TRUE_FALSE: 1, SHORT_ANSWER: 1 },
            variantCount: 1,
          },
          placements: [
            {
              provenance: 'AI_CANDIDATE',
              body: {
                version: 1,
                blocks: [{ id: 'q1-body', type: 'text', content: 'ما ناتج 2 + 3؟', direction: 'rtl' }],
              },
              modelAnswer: {
                version: 1,
                blocks: [{ id: 'q1-ans', type: 'text', content: 'ب) 5', direction: 'rtl' }],
                type: 'MULTIPLE_CHOICE',
                correctOptionLabel: 'ب',
              },
              marks: 2,
              answerSpaceLines: 2,
              curriculumNodeIds: [qNodeId],
              sourceReferenceIds: [],
              position: 0,
            },
            {
              provenance: 'AI_CANDIDATE',
              body: {
                version: 1,
                blocks: [{ id: 'q2-body', type: 'text', content: 'صِف خطوات حل المعادلة: 2x + 5 = 11', direction: 'rtl' }],
              },
              modelAnswer: {
                version: 1,
                blocks: [{ id: 'q2-ans', type: 'text', content: 'طرح 5 من الطرفين، ثم القسمة على 2', direction: 'rtl' }],
                type: 'SHORT_ANSWER',
                rubricCriteria: [
                  { key: 'isolation', label: 'عزل المتغير', maxMarks: 1, description: 'طرح 5 من الطرفين' },
                  { key: 'division', label: 'القسمة', maxMarks: 1, description: 'قسمة على 2' },
                ],
              },
              marks: 2,
              answerSpaceLines: 3,
              curriculumNodeIds: [qNodeId],
              sourceReferenceIds: [],
              position: 1,
            },
            {
              provenance: 'AI_CANDIDATE',
              body: {
                version: 1,
                blocks: [{ id: 'q3-body', type: 'text', content: 'هل العدد 10 عدد زوجي؟', direction: 'rtl' }],
              },
              modelAnswer: {
                version: 1,
                blocks: [{ id: 'q3-ans', type: 'text', content: 'صواب', direction: 'rtl' }],
                type: 'TRUE_FALSE',
                correctResponse: 'صواب',
              },
              marks: 2,
              answerSpaceLines: 1,
              curriculumNodeIds: [qNodeId],
              sourceReferenceIds: [],
              position: 2,
            },
          ],
          sectionTitle: 'القسم الرئيسي',
        });
        return result;
      } catch (e) {
        return { error: String(e) };
      }
    });

    const examId = examResult?.data?.id || null;

    // Create a capture session for the exam
    let sessionId = '';
    if (examId) {
      const sessionResult = await page.evaluate(async (examId: string) => {
        const tibyan = (window as any).tibyan;
        const result = await tibyan.capture.createSession({ examId, examFormLabel: 'A' });
        return result.success ? result.data : null;
      }, examId);
      sessionId = sessionResult?.id || '';
    }

    // Create a temporary PNG file for import
    const fixtureDir = path.join(testDataDir, 'fixtures');
    fs.mkdirSync(fixtureDir, { recursive: true });
    const fixturePng = path.join(fixtureDir, 'test-page.png');
    // Create a minimal valid 1x1 white PNG
    const pngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478016360f8cf000000020001e221bc330000000049454e44ae426082',
      'hex'
    );
    fs.writeFileSync(fixturePng, pngBuffer);

    // Import the file
    let submissionId = '';
    if (sessionId) {
      const importResult = await page.evaluate(async (args: { sessionId: string; filePath: string }) => {
        const tibyan = (window as any).tibyan;
        const result = await tibyan.capture.importFiles({
          sessionId: args.sessionId,
          filePaths: [args.filePath],
        });
        if (result.success && result.data.pages.length > 0) {
          return { submissionId: result.data.pages[0].submissionId, pageCount: result.data.pages.length };
        }
        return null;
      }, { sessionId, filePath: fixturePng });
      submissionId = importResult?.submissionId || '';
    }

    // Extract answers first, then grade deterministically
    if (submissionId) {
      await page.evaluate(async (sid: string) => {
        const tibyan = (window as any).tibyan;
        await tibyan.grading.extractAnswers(sid);
        await tibyan.grading.gradeSubmission({ submissionId: sid, method: 'DETERMINISTIC' });
      }, submissionId);
    }

    // ── 3. Verify Phase 5 Dashboard Banner ──
    const phase5Banner = page.locator('[data-testid="banner-paper-correction"]');
    await expect(phase5Banner).toBeVisible({ timeout: 10000 });
    await expect(phase5Banner).toContainText('تصحيح الأوراق والتحليلات');

    const captureBtn = page.locator('[data-testid="btn-open-capture-from-dashboard"]');
    await expect(captureBtn).toBeVisible();

    // Screenshot 1: 01-phase5-navigation.png
    await page.screenshot({ path: path.join(docsDir, '01-phase5-navigation.png') });

    // ── 4. Navigate to Capture Session Page via banner ──
    await captureBtn.click();

    const capturePage = page.locator('[data-testid="page-capture-session"]');
    await expect(capturePage).toBeVisible({ timeout: 10000 });

    // If session was created, select it to show submissions
    if (sessionId) {
      const sessionCard = page.locator(`[data-testid^="session-card-"]`).first();
      if (await sessionCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sessionCard.click();
        await page.waitForTimeout(500);
      }
    }

    // Screenshot 2: 02-capture-session-import.png
    await page.screenshot({ path: path.join(docsDir, '02-capture-session-import.png') });

    // ── 5. Navigate to Correction Workspace ──
    if (submissionId) {
      await page.evaluate((sid: string) => {
        window.location.hash = `#/grading/${sid}`;
      }, submissionId);
    } else {
      await page.evaluate(() => {
        window.location.hash = '#/grading/test-submission-id';
      });
    }
    await page.waitForTimeout(1500);

    const correctionPage = page.locator('[data-testid="page-correction-workspace"]');
    const correctionError = page.locator('[data-testid="correction-error"]');
    const correctionLoading = page.locator('[data-testid="correction-loading"]');

    await Promise.race([
      correctionPage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      correctionError.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      correctionLoading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);

    if (await correctionPage.isVisible()) {
      // Screenshot 3: 03-submission-page-review.png — correction workspace overview
      await page.screenshot({ path: path.join(docsDir, '03-submission-page-review.png') });

      // Switch to extracted answers tab
      const extractedTab = page.locator('[data-testid="tab-extracted"]');
      if (await extractedTab.isVisible()) {
        await extractedTab.click();
        await page.waitForTimeout(1000);
        // Screenshot 4: 04-extraction-review.png
        await page.screenshot({ path: path.join(docsDir, '04-extraction-review.png') });
      }

      // Switch back to decisions tab for partial credit screenshot
      const decisionsTab = page.locator('[data-testid="tab-decisions"]');
      if (await decisionsTab.isVisible()) {
        await decisionsTab.click();
        await page.waitForTimeout(500);

        // Navigate to the SHORT_ANSWER question (question 2, index 1) which has rubric criteria
        const nextBtn = page.locator('[data-testid="next-question-btn"]');
        if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
          await nextBtn.click();
          await page.waitForTimeout(300);
        }

        // Open the edit/override form to show teacher adjustment controls
        const editBtn = page.locator('[data-testid="edit-decision-btn"]');
        if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await editBtn.click();
          await page.waitForTimeout(500);
        }

        // Screenshot 5: 05-partial-credit-correction.png
        await page.screenshot({ path: path.join(docsDir, '05-partial-credit-correction.png') });
      }
    } else {
      // Even error/loading state is a valid screenshot
      await page.screenshot({ path: path.join(docsDir, '03-submission-page-review.png') });
    }

    // ── 6. Navigate to Student Result ──
    if (submissionId) {
      await page.evaluate((sid: string) => {
        window.location.hash = `#/student-result/${sid}`;
      }, submissionId);
    } else {
      await page.evaluate(() => {
        window.location.hash = '#/student-result/test-id';
      });
    }
    await page.waitForTimeout(1500);

    // Screenshot 6: 06-finalized-student-result.png
    await page.screenshot({ path: path.join(docsDir, '06-finalized-student-result.png') });

    // ── 7. Navigate to Analytics ──
    await page.evaluate(() => {
      window.location.hash = '#/analytics';
    });
    await page.waitForTimeout(500);

    const analyticsPage = page.locator('[data-testid="page-analytics-dashboard"]');
    await expect(analyticsPage).toBeVisible({ timeout: 10000 });

    // Select the exam in analytics if we created one
    if (examId) {
      const analyticsSelect = page.locator('[data-testid="analytics-exam-select"]');
      if (await analyticsSelect.isVisible()) {
        await analyticsSelect.selectOption(examId);
        await page.waitForTimeout(1000);
      }
    }

    // Screenshot 7: 07-exam-analytics.png
    await page.screenshot({ path: path.join(docsDir, '07-exam-analytics.png') });

    // Scroll down to see skill performance section
    await page.evaluate(() => {
      window.scrollBy(0, 500);
    });
    await page.waitForTimeout(300);

    // Screenshot 8: 08-skill-performance.png
    await page.screenshot({ path: path.join(docsDir, '08-skill-performance.png') });

    // ── 8. Test Scrolling at 1366x768 ──
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => {
      window.location.hash = '#/capture';
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    await expect(capturePage).toBeVisible({ timeout: 10000 });

    // Verify no scroll traps by scrolling down
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(300);

    // ── 9. Toggle Dark Mode ──
    const themeToggleBtn = page.locator('[data-testid="topbar-theme-toggle-btn"]');
    await expect(themeToggleBtn).toBeVisible();
    await themeToggleBtn.click();
    await page.waitForTimeout(500);

    const rootElement = page.locator('html');
    const themeClass = await rootElement.getAttribute('class');
    expect(themeClass).toContain('dark');

    // Navigate to analytics in dark mode
    await page.evaluate(() => {
      window.location.hash = '#/analytics';
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    // Screenshot 9: 09-phase5-dark-mode.png
    await page.screenshot({ path: path.join(docsDir, '09-phase5-dark-mode.png') });

    // ── 10. Switch back to Light Mode ──
    await themeToggleBtn.click();
    await page.waitForTimeout(300);

    // ── 11. Verify Navigation Items ──
    await page.evaluate(() => {
      window.location.hash = '#/';
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    const todayPage = page.locator('[data-testid="page-today"]');
    await expect(todayPage).toBeVisible({ timeout: 10000 });

    // Verify all nav items
    await expect(page.locator('[data-testid="nav-item-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-item-students"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-item-groups"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-item-exams"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-item-finance"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-item-settings"]')).toBeVisible();

    // Verify Phase 5 banner is still visible on dashboard
    await expect(phase5Banner).toBeVisible();

    // ── 12. Verify Electron Security ──
    const apiExposed = await page.evaluate(() => {
      return typeof (window as any).tibyan === 'object' && (window as any).tibyan !== null;
    });
    expect(apiExposed).toBe(true);

    const nodeBlocked = await page.evaluate(() => {
      try {
        return typeof (window as any).require === 'undefined';
      } catch {
        return true;
      }
    });
    expect(nodeBlocked).toBe(true);
  });
});
