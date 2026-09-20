import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 3 — Tasks 4-6 Visual Gate Spec', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../test-results/phase3-final-gate');
  const docsDir = path.resolve(__dirname, '../../../docs/screenshots/phase3-final');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-phase3-final-gate-'));
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

  test('captures complete visual workflow: PDF Sources, Source Page References, Question Bank, and Bulk Ingestion Review', async () => {
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

    await expect(appShell).toBeVisible({ timeout: 15000 });

    // 2. Create sample PDF in test directory for ingestion
    const samplePdfPath = path.join(testDataDir, 'algebra-secondary.pdf');
    const samplePdfBytes = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
      'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
      'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n187\n%%EOF\n'
    );
    fs.writeFileSync(samplePdfPath, samplePdfBytes);

    // 3. Navigate to Sources Page
    await page.evaluate(() => {
      window.location.hash = '#/sources';
    });

    const sourcesPage = page.locator('[data-testid="sources-page"]');
    await expect(sourcesPage).toBeVisible({ timeout: 10000 });

    // Open Import PDF modal
    const openImportBtn = page.locator('[data-testid="open-import-pdf-modal-btn"]');
    await expect(openImportBtn).toBeVisible({ timeout: 5000 });
    await openImportBtn.click();

    const importForm = page.locator('[data-testid="import-pdf-form"]');
    await expect(importForm).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="pdf-file-path-input"]').fill(samplePdfPath);
    await page.locator('[data-testid="pdf-title-input"]').fill('كتاب الجبر والهندسة الفراغية 2026');
    await page.locator('[data-testid="pdf-author-input"]').fill('وزارة التربية والتعليم');
    await page.locator('[data-testid="pdf-edition-input"]').fill('طبعة 2026');

    // Submit import
    await page.locator('[data-testid="submit-import-pdf-btn"]').click();
    await expect(importForm).toBeHidden({ timeout: 10000 });

    // Verify document card appears
    await expect(page.locator('text=كتاب الجبر والهندسة الفراغية 2026').first()).toBeVisible({ timeout: 10000 });

    // Capture 01: Sources Page & Imported PDF Document Card
    const shot01 = path.join(screenshotsDir, '01-sources-catalog-view.png');
    await page.screenshot({ path: shot01, fullPage: true });

    // 4. Open Source References Modal
    const manageRefsBtn = page.locator('button:has-text("مراجع الصفحات")').first();
    await expect(manageRefsBtn).toBeVisible();
    await manageRefsBtn.click();

    const refsModal = page.locator('[data-testid="source-references-modal"]');
    await expect(refsModal).toBeVisible({ timeout: 5000 });

    // Add a page reference within the document page count (1 page)
    await page.locator('[data-testid="reference-label-input"]').fill('تمارين الجبر النموذجية');
    await page.locator('[data-testid="reference-start-page-input"]').fill('1');
    await page.locator('[data-testid="reference-end-page-input"]').fill('1');
    await page.locator('[data-testid="reference-notes-input"]').fill('مسائل على المحددات والمصفوفات');
    await page.locator('[data-testid="save-reference-btn"]').click();

    await expect(page.locator('text=تمارين الجبر النموذجية').first()).toBeVisible({ timeout: 5000 });

    // Capture 02: Source Page References Modal
    const shot02 = path.join(screenshotsDir, '02-source-references-modal.png');
    await page.screenshot({ path: shot02, fullPage: true });

    // Close references modal
    await page.keyboard.press('Escape');
    await expect(refsModal).toBeHidden({ timeout: 5000 });

    // 5. Navigate to Curriculum page and create a catalog + lesson for tagging
    await page.evaluate(() => {
      window.location.hash = '#/curriculum';
    });

    const curriculumPage = page.locator('[data-testid="page-curriculum"]');
    await expect(curriculumPage).toBeVisible({ timeout: 10000 });

    const createCatalogBtn = page.locator('[data-testid="btn-create-catalog"]');
    await expect(createCatalogBtn).toBeVisible({ timeout: 5000 });
    await createCatalogBtn.click();

    const catalogModal = page.locator('[data-testid="form-create-catalog"]');
    await expect(catalogModal).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="input-catalog-code"]').fill('CALC-SEC3');
    await page.locator('[data-testid="input-catalog-title"]').fill('تفاضل وتكامل الصف الثالث الثانوي');
    await page.locator('[data-testid="select-catalog-grade"]').selectOption('SEC_3');
    await page.locator('[data-testid="btn-submit-create-catalog"]').click();
    await expect(catalogModal).toBeHidden({ timeout: 5000 });

    // Add Unit and Lesson
    const addUnitBtn = page.locator('[data-testid="btn-add-unit"]');
    await expect(addUnitBtn).toBeVisible({ timeout: 5000 });
    await addUnitBtn.click();

    const titleInput = page.locator('[data-testid="input-node-title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('الوحدة الأولى: الجبر الخطي');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    const addLessonBtn = page.locator('button:has-text("إضافة درس")');
    await expect(addLessonBtn).toBeVisible({ timeout: 5000 });
    await addLessonBtn.click();

    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('المحددات والمصفوفات وتطبيقاتها');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // 6. Navigate to Question Bank Page
    await page.evaluate(() => {
      window.location.hash = '#/questions';
    });

    const questionBankPage = page.locator('[data-testid="question-bank-page"]');
    await expect(questionBankPage).toBeVisible({ timeout: 10000 });

    // Open Create Question Modal
    const createQuestionBtn = page.locator('[data-testid="create-new-question-btn"]');
    await expect(createQuestionBtn).toBeVisible({ timeout: 5000 });
    await createQuestionBtn.click();

    const questionEditorForm = page.locator('[data-testid="question-editor-form"]');
    await expect(questionEditorForm).toBeVisible({ timeout: 5000 });

    // Select curriculum catalog and node
    const tagCatalogSelect = page.locator('[data-testid="tag-catalog-select"]');
    await tagCatalogSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    const tagNodeSelect = page.locator('[data-testid="tag-node-select"]');
    await tagNodeSelect.selectOption({ index: 1 });
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="add-curriculum-tag-btn"]') as HTMLButtonElement;
      btn?.click();
    });
    await page.waitForTimeout(500);

    // Capture 03: Question Bank Editor Modal with Rich Input and Classification
    const shot03 = path.join(screenshotsDir, '03-question-editor-modal.png');
    await page.screenshot({ path: shot03, fullPage: true });

    // Save Question
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="save-question-submit-btn"]') as HTMLButtonElement;
      btn?.click();
    });
    await expect(questionEditorForm).toBeHidden({ timeout: 10000 });

    // Verify Question Card in Bank
    await expect(page.locator('text=Q-000001').first()).toBeVisible({ timeout: 10000 });

    // 7. Open Bulk Ingestion Modal and Preview
    const openBulkBtn = page.locator('[data-testid="open-bulk-ingestion-modal-btn"]');
    await expect(openBulkBtn).toBeVisible({ timeout: 5000 });
    await openBulkBtn.click();

    const bulkModal = page.locator('[data-testid="bulk-ingestion-modal"]');
    await expect(bulkModal).toBeVisible({ timeout: 5000 });

    // Load sample items
    const loadSampleBtn = page.locator('[data-testid="load-sample-btn"]');
    await expect(loadSampleBtn).toBeVisible({ timeout: 5000 });
    await loadSampleBtn.click();

    // Trigger preview and duplicate check
    const previewBtn = page.locator('[data-testid="preview-bulk-btn"]');
    await expect(previewBtn).toBeEnabled({ timeout: 5000 });
    await previewBtn.click();

    // Verify review summary stats appear
    await expect(page.locator('text=إجمالي الدفعة').first()).toBeVisible({ timeout: 10000 });

    // Capture 04: Bulk Ingestion Review & Duplicate Matching Matrix
    const shot04 = path.join(screenshotsDir, '04-bulk-ingestion-review.png');
    await page.screenshot({ path: shot04, fullPage: true });

    // Copy to docs/screenshots/phase3-final
    fs.copyFileSync(shot01, path.join(docsDir, '01-sources-catalog-view.png'));
    fs.copyFileSync(shot02, path.join(docsDir, '02-source-references-modal.png'));
    fs.copyFileSync(shot03, path.join(docsDir, '03-question-editor-modal.png'));
    fs.copyFileSync(shot04, path.join(docsDir, '04-bulk-ingestion-review.png'));

    // Confirm screenshots exist and are valid sizes
    expect(fs.statSync(path.join(docsDir, '01-sources-catalog-view.png')).size).toBeGreaterThan(10000);
    expect(fs.statSync(path.join(docsDir, '02-source-references-modal.png')).size).toBeGreaterThan(10000);
    expect(fs.statSync(path.join(docsDir, '03-question-editor-modal.png')).size).toBeGreaterThan(10000);
    expect(fs.statSync(path.join(docsDir, '04-bulk-ingestion-review.png')).size).toBeGreaterThan(10000);
  });
});
