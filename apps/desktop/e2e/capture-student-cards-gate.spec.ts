import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Student Cards Visual Approval Gate & Verification Suite', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const artifactDir = 'C:\\Users\\zeyad mohamed\\.gemini\\antigravity-ide\\brain\\d706cd3a-84a5-4152-b094-7a238e59f5ec';
  const screenshotsDir = path.join(artifactDir, 'screenshots');
  const pdfArtifactPath = path.join(artifactDir, 'student-cards-batch.pdf');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-student-cards-'));
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

  test('captures Student Cards at 1920x1080 & 1366x768, single card, A4 page 1 & 2, and exports valid PDF', async () => {
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
    await expect(wizardStartBtn).toBeVisible({ timeout: 20000 });
    await wizardStartBtn.click();

    await page.locator('[data-testid="input-owner-fullname"]').fill('الأستاذ أحمد الشريف');
    await page.locator('[data-testid="input-owner-username"]').fill('teacher');
    await page.locator('[data-testid="input-owner-pin"]').fill('1234');
    await page.locator('[data-testid="input-owner-confirm-pin"]').fill('1234');
    await page.locator('[data-testid="submit-owner-btn"]').click();

    const yearSubmitBtn = page.locator('[data-testid="submit-year-btn"]');
    await expect(yearSubmitBtn).toBeVisible({ timeout: 15000 });
    await yearSubmitBtn.click();

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

    await page.waitForTimeout(600);
    if (await loginScreen.isVisible()) {
      await page.keyboard.type('1234');
    }

    await expect(appShell).toBeVisible({ timeout: 15000 });

    // 2. Populate 10 realistic Arabic students via window.tibyan
    const studentList = [
      { fullName: 'زياد محمد عبد الله', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01012345678' },
      { fullName: 'مريم أحمد إبراهيم', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01023456789' },
      { fullName: 'عمر خالد الدسوقي', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01034567890' },
      { fullName: 'فاطمة حسن المنشاوي', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01045678901' },
      { fullName: 'يوسف هاني عبد الرحمن', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01056789012' },
      { fullName: 'نور الدين مصطفى كامل', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01067890123' },
      { fullName: 'سارة طارق رضوان', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01078901234' },
      { fullName: 'كريم عادل الباز', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01089012345' },
      { fullName: 'هدى محمود سامي', system: 'EGYPTIAN_BACCALAUREATE', grade: 'SEC_2', track: 'LANG_ENGLISH', phone: '01090123456' },
      { fullName: 'حمزة يحيى الشناوي', system: 'GENERAL', grade: 'SEC_1', track: 'ARABIC', phone: '01001234567' },
    ];

    const createdIds = await page.evaluate(async (students) => {
      const ids: string[] = [];
      for (const s of students) {
        const res = await window.tibyan.students.create({
          fullName: s.fullName,
          educationSystem: s.system as any,
          gradeLevel: s.grade as any,
          languageTrack: s.track as any,
          guardianPhone: s.phone,
        });
        if (res.success && res.data) {
          ids.push(res.data.id);
        }
      }
      return ids;
    }, studentList);

    expect(createdIds.length).toBe(10);

    // 3. Navigate to /students
    await page.evaluate(() => {
      window.location.hash = '#/students';
    });

    const studentsPage = page.locator('[data-testid="page-students"]');
    await expect(studentsPage).toBeVisible({ timeout: 15000 });
    const studentsTable = page.locator('[data-testid="students-table"]');
    await expect(studentsTable).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // 4. Capture 1920x1080 Workspace with batch selection
    await page.setViewportSize({ width: 1920, height: 1080 });
    const selectAllCheckbox = page.locator('[data-testid="select-all-students-checkbox"]');
    await selectAllCheckbox.click();
    await page.waitForTimeout(600);

    const batchPrintBtn = page.locator('[data-testid="batch-print-cards-btn"]');
    await expect(batchPrintBtn).toBeVisible();

    const workspace1920Path = path.join(screenshotsDir, 'task3-student-cards-workspace-1920x1080.png');
    await page.screenshot({ path: workspace1920Path, fullPage: true });

    // 5. Capture 1366x768 Workspace
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(600);
    const workspace1366Path = path.join(screenshotsDir, 'task3-student-cards-workspace-1366x768.png');
    await page.screenshot({ path: workspace1366Path, fullPage: true });

    // 6. Open Batch Modal at 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(300);
    await batchPrintBtn.click();

    const previewModal = page.locator('[data-testid="student-card-preview-modal"]');
    await expect(previewModal).toBeVisible({ timeout: 10000 });

    // Single Card View is the default tab in the modal
    const singleCard = page.locator('[data-testid="student-card"]').first();
    await expect(singleCard).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    // Capture Single Student Card Preview (Close-up of the rendered card)
    const singleCardPath = path.join(screenshotsDir, 'task3-single-student-card-preview.png');
    await singleCard.screenshot({ path: singleCardPath });

    // Capture Full Modal at 1920x1080
    const modal1920Path = path.join(screenshotsDir, 'task3-card-preview-modal-1920x1080.png');
    await page.screenshot({ path: modal1920Path, fullPage: true });

    // 7. Switch to A4 print sheet tab
    const tabA4 = page.locator('[data-testid="tab-a4-sheet"]');
    await tabA4.click();
    await page.waitForTimeout(1000);

    const a4Pages = page.locator('[data-testid="a4-sheet-viewport"] [data-testid="a4-print-page"]');
    await expect(a4Pages).toHaveCount(2);

    // Page 1 screenshot (Contains 8 realistic Arabic students)
    const a4Page1Path = path.join(screenshotsDir, 'task3-a4-sheet-page-1.png');
    await a4Pages.nth(0).screenshot({ path: a4Page1Path });

    // Page 2 screenshot (Proving pagination with students 9 & 10)
    const a4Page2Path = path.join(screenshotsDir, 'task3-a4-sheet-page-2.png');
    await a4Pages.nth(1).screenshot({ path: a4Page2Path });

    // 8. Generate and verify local A4 PDF artifact
    const pdfExportResult = await page.evaluate(async (targetPath) => {
      return await window.tibyan.students.exportCardsPdf({ targetPath });
    }, pdfArtifactPath);

    expect(pdfExportResult.success).toBe(true);
    expect(fs.existsSync(pdfArtifactPath)).toBe(true);

    const pdfBuffer = fs.readFileSync(pdfArtifactPath);
    expect(pdfBuffer.length).toBeGreaterThan(10000);
    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');

    // 9. Close Modal cleanly
    const closeBtn = page.locator('[data-testid="btn-close-card-modal"]');
    await closeBtn.click();
    await expect(previewModal).toBeHidden({ timeout: 5000 });
  });
});
