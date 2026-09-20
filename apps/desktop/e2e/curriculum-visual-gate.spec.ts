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
  const docsDir = path.resolve(__dirname, '../../../docs/screenshots/phase3-task1');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-curriculum-gate-'));
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

  test('captures full Curriculum workflow: Catalogs List, Create Modal, Populated Tree View, and Rendered Group Syllabus Card', async () => {
    test.setTimeout(180000);
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
      await page.evaluate(() => {
        window.location.hash = '#/curriculum';
      });
    }

    const curriculumPage = page.locator('[data-testid="page-curriculum"]');
    await expect(curriculumPage).toBeVisible({ timeout: 10000 });

    // Capture 01: Curriculum Catalogs List (Initial / Empty workspace)
    const shot01 = path.join(screenshotsDir, '01-curriculum-catalogs-workspace.png');
    await page.screenshot({ path: shot01, fullPage: true });

    // 3. Open Create Catalog Modal
    const createBtn = page.locator('[data-testid="btn-create-catalog"]');
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    const modal = page.locator('[data-testid="form-create-catalog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill in sample data matching default General / Sec 1 / Arabic
    await page.locator('[data-testid="input-catalog-code"]').fill('MATH-SEC1');
    await page.locator('[data-testid="input-catalog-title"]').fill('رياضيات الصف الأول الثانوي');

    // Capture 02: Create Catalog Modal
    const shot02 = path.join(screenshotsDir, '02-curriculum-create-modal.png');
    await page.screenshot({ path: shot02, fullPage: true });

    // Submit creation
    await page.locator('[data-testid="btn-submit-create-catalog"]').click();
    await expect(modal).toBeHidden({ timeout: 5000 });

    // 4. Build Complete 4-Tier Tree: UNIT -> LESSON -> CONCEPT -> SKILL
    // Add Unit
    const addUnitBtn = page.locator('[data-testid="btn-add-unit"]');
    await expect(addUnitBtn).toBeVisible({ timeout: 5000 });
    await addUnitBtn.click();

    const titleInput = page.locator('[data-testid="input-node-title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('الوحدة الأولى: المصفوفات والمحددات');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // Add Lesson under Unit
    const addLessonBtn = page.locator('button:has-text("إضافة درس")');
    await expect(addLessonBtn).toBeVisible({ timeout: 5000 });
    await addLessonBtn.click();

    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('الدرس الأول: تنظيم البيانات في مصفوفات');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // Add Concept under Lesson
    const addConceptBtn = page.locator('button:has-text("إضافة مفهوم")');
    await expect(addConceptBtn).toBeVisible({ timeout: 5000 });
    await addConceptBtn.click();

    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('المفهوم الأول: رتبة وتساوي المصفوفات');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // Add Skill under Concept
    const addSkillBtn = page.locator('button:has-text("إضافة مهارة")');
    await expect(addSkillBtn).toBeVisible({ timeout: 5000 });
    await addSkillBtn.click();

    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('مهارة حل مسائل إيجاد رتبة المصفوفة');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // Wait for full tree view to render
    await page.waitForTimeout(500);

    // Capture 03: Populated Curriculum Tree View (4 tiers clearly visible)
    const shot03 = path.join(screenshotsDir, '03-curriculum-tree-view.png');
    await page.screenshot({ path: shot03, fullPage: true });

    // Publish the catalog
    const publishBtn = page.locator('[data-testid="btn-publish-catalog"]');
    await expect(publishBtn).toBeVisible({ timeout: 5000 });
    await publishBtn.click();

    // Verify catalog is published
    await expect(page.locator('text=منهج منشور ومعتمد')).toBeVisible({ timeout: 8000 });

    // 5. Navigate to Groups & Create a Compatible Group
    const groupsNavBtn = page.locator('[data-testid="nav-groups"]');
    if (await groupsNavBtn.isVisible()) {
      await groupsNavBtn.click();
    } else {
      await page.evaluate(() => {
        window.location.hash = '#/groups';
      });
    }

    const groupsPage = page.locator('[data-testid="page-groups"]');
    await expect(groupsPage).toBeVisible({ timeout: 10000 });

    // Click Create Group
    const createGroupBtn = page.locator('[data-testid="btn-create-group"], [data-testid="btn-empty-create-group"]').first();
    await expect(createGroupBtn).toBeVisible({ timeout: 5000 });
    await createGroupBtn.click();

    // Fill Group Name (defaults to GENERAL / SEC_1 / ARABIC matching catalog)
    const groupNameInput = page.locator('[data-testid="input-group-name"]');
    await expect(groupNameInput).toBeVisible({ timeout: 5000 });
    await groupNameInput.fill('مجموعة المتفوقين - أولى ثانوي');

    // Submit Group Creation
    await page.locator('[data-testid="btn-submit-group"]').click();
    await expect(groupNameInput).toBeHidden({ timeout: 5000 });

    // Open Group Details
    const groupRow = page.locator('[data-testid^="group-row-"]').first();
    await expect(groupRow).toBeVisible({ timeout: 5000 });
    await groupRow.click();

    const groupDetailsPage = page.locator('[data-testid="page-group-details"]');
    await expect(groupDetailsPage).toBeVisible({ timeout: 10000 });

    // 6. Assign Catalog in Group Details
    const openAssignBtn = page.locator('[data-testid="btn-open-assign-modal"]');
    await expect(openAssignBtn).toBeVisible({ timeout: 5000 });
    await openAssignBtn.click();

    const assignModal = page.locator('[data-testid="modal-assign-catalog"]');
    await expect(assignModal).toBeVisible({ timeout: 5000 });

    const selectCatalog = page.locator('[data-testid="select-assign-catalog"]');
    await expect(selectCatalog).toBeVisible({ timeout: 5000 });

    // Select the published catalog option
    const optionValue = await selectCatalog.locator('option').nth(1).getAttribute('value');
    await selectCatalog.selectOption(optionValue!);

    // Confirm assignment
    await page.locator('[data-testid="btn-confirm-assign-catalog"]').click();
    await expect(assignModal).toBeHidden({ timeout: 5000 });

    // Verify Syllabus Card is rendered with metrics
    const syllabusMetrics = page.locator('[data-testid="syllabus-metrics"]');
    await expect(syllabusMetrics).toBeVisible({ timeout: 8000 });

    // 7. Update Skill Progress to COMPLETED
    const skillStatusSelect = page.locator('[data-testid^="select-skill-status-"]').first();
    await expect(skillStatusSelect).toBeVisible({ timeout: 5000 });
    await skillStatusSelect.selectOption('COMPLETED');

    // Verify 100% completion badge / metrics
    await expect(syllabusMetrics).toContainText('100%', { timeout: 8000 });
    await expect(page.locator('[data-testid="badge-pacing-status"]')).toContainText('مكتمل', { timeout: 5000 });

    // Scroll syllabus card into view for a clean capture
    await page.locator('[data-testid="section-group-syllabus"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Capture 04: Rendered Group Syllabus Card with 100% progress and updated skill
    const shot04 = path.join(screenshotsDir, '04-group-syllabus-card.png');
    await page.screenshot({ path: shot04, fullPage: true });

    // Copy screenshots to docs directory as well
    for (const file of [
      '01-curriculum-catalogs-workspace.png',
      '02-curriculum-create-modal.png',
      '03-curriculum-tree-view.png',
      '04-group-syllabus-card.png',
    ]) {
      const src = path.join(screenshotsDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(docsDir, file));
      }
    }
  });
});
