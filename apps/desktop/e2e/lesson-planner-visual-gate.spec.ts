import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 3 — Task 3: Lesson Planner & Session Reflection Visual Gate Spec', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../test-results/lesson-planner-visual-gate');
  const docsDir = path.resolve(__dirname, '../../../docs/screenshots/phase3-task3');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-lesson-planner-gate-'));
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

  test('captures Lesson Planner Authoring, Dynamic Timing Calculator, Session Reflection Modal, and Immutable Historical Snapshot View', async () => {
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

    // 2. Navigate to Curriculum page
    await page.evaluate(() => {
      window.location.hash = '#/curriculum';
    });

    const curriculumPage = page.locator('[data-testid="page-curriculum"]');
    await expect(curriculumPage).toBeVisible({ timeout: 10000 });

    // 3. Create a Curriculum Catalog
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

    // 4. Build Complete 4-Tier Tree: UNIT -> LESSON -> CONCEPT -> SKILL
    const addUnitBtn = page.locator('[data-testid="btn-add-unit"]');
    await expect(addUnitBtn).toBeVisible({ timeout: 5000 });
    await addUnitBtn.click();

    const titleInput = page.locator('[data-testid="input-node-title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('الوحدة الأولى: الاشتقاق وتطبيقاته');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // Add Lesson
    const addLessonBtn = page.locator('button:has-text("إضافة درس")');
    await expect(addLessonBtn).toBeVisible({ timeout: 5000 });
    await addLessonBtn.click();

    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('الدرس الأول: قاعدة السلسلة وتفاضل الدوال المثلثية');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // Add Concept
    const addConceptBtn = page.locator('button:has-text("إضافة مفهوم")');
    await expect(addConceptBtn).toBeVisible({ timeout: 5000 });
    await addConceptBtn.click();

    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('مفهوم قاعدة السلسلة ودوال الدوال');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // Add Skill
    const addSkillBtn = page.locator('button:has-text("إضافة مهارة")');
    await expect(addSkillBtn).toBeVisible({ timeout: 5000 });
    await addSkillBtn.click();

    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('تطبيق قاعدة السلسلة على الدوال الدائرية المركبة');
    await page.locator('[data-testid="btn-submit-add-node"]').click();
    await expect(titleInput).toBeHidden({ timeout: 5000 });

    // 5. Open Lesson Planner Modal from Tree View
    const planLessonBtn = page.locator('[data-testid^="btn-plan-lesson-"]').first();
    await expect(planLessonBtn).toBeVisible({ timeout: 5000 });
    await planLessonBtn.click();

    const planModal = page.locator('[data-testid="lesson-plan-modal"]');
    await expect(planModal).toBeVisible({ timeout: 5000 });

    // Fill Title and Objectives
    const planTitleInput = page.locator('[data-testid="input-plan-title"]');
    await expect(planTitleInput).toBeVisible({ timeout: 5000 });
    await planTitleInput.fill('خطة درس قاعدة السلسلة وتفاضل الدوال الدائرية');

    const newObjInput = page.locator('[data-testid="input-new-objective"]');
    await newObjInput.fill('فهم واستنتاج قاعدة السلسلة');
    await page.locator('[data-testid="btn-add-objective"]').click();

    await newObjInput.fill('تطبيق القاعدة على تفاضل الدوال المثلثية المركبة');
    await page.locator('[data-testid="btn-add-objective"]').click();

    // Switch to Explanation tab and write math formulas
    await page.locator('[data-testid="tab-explanation"]').click();
    const explanationSection = page.locator('[data-testid="section-explanation"]');
    await expect(explanationSection).toBeVisible({ timeout: 5000 });

    // Add formula in explanation editor
    const mathTextarea = explanationSection.locator('textarea[dir="ltr"]').first();
    if (await mathTextarea.isVisible()) {
      await mathTextarea.fill('\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}');
    }

    await page.waitForTimeout(600);

    // Capture 01: Lesson Planner Authoring with Pedagogical Sections & MathRichContent
    const shot01 = path.join(screenshotsDir, '01-lesson-planner-authoring.png');
    await page.screenshot({ path: shot01, fullPage: true });

    // Switch to Timing Breakdown Simulator Tab
    await page.locator('[data-testid="tab-timing"]').click();
    const timingSection = page.locator('[data-testid="section-timing"]');
    await expect(timingSection).toBeVisible({ timeout: 5000 });

    // Check timing calculator exact match badge
    const timingBadge = page.locator('[data-testid="timing-validation-badge"]');
    await expect(timingBadge).toBeVisible({ timeout: 5000 });
    await expect(timingBadge).toContainText('مطابق تماماً');

    await page.waitForTimeout(500);

    // Capture 02: Dynamic Timing Calculator in Action
    const shot02 = path.join(screenshotsDir, '02-lesson-planner-timing-calculator.png');
    await page.screenshot({ path: shot02, fullPage: true });

    // Save the Lesson Plan
    await page.locator('[data-testid="btn-save-lesson-plan"]').click();
    await expect(planModal).toBeHidden({ timeout: 6000 });

    // Publish the catalog now that tree completeness is satisfied
    await page.locator('[data-testid="btn-publish-catalog"]').click();
    await expect(page.locator('text=منهج منشور ومعتمد')).toBeVisible({ timeout: 8000 });

    // 6. Create Group, Schedule, and Session via IPC for clean execution
    const sessionId = await page.evaluate(async () => {
      // 1. Create student
      const st = await window.tibyan.students.create({
        fullName: 'أحمد محمود يوسف',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_3',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      });

      // 2. Create group with schedule for today
      const todayWeekday = new Date().getDay();
      const grp = await window.tibyan.groups.create({
        name: 'مجموعة النخبة - 3 ثانوي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_3',
        languageTrack: 'ARABIC',
        defaultPaymentType: 'PER_SESSION',
        defaultPaymentAmount: 400,
        schedules: [
          {
            weekday: todayWeekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            startTime: '16:00',
            durationMinutes: 90,
          },
        ],
      });

      if (!grp.success || !grp.data) {
        throw new Error('Create group failed: ' + JSON.stringify(grp));
      }
      const groupId = grp.data.id;

      // 3. Enroll student
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      await window.tibyan.enrollments.enroll({
        groupId,
        studentId: st.data!.id,
        effectiveDate: dateStr,
      });

      // 5. Materialize sessions
      await window.tibyan.sessions.materializeRollingSessions();

      // 6. Find today's session
      const sessions = await window.tibyan.sessions.listByRange({
        startDate: dateStr,
        endDate: dateStr,
      });

      const todaySession = sessions.data && sessions.data.find((s) => s.groupId === groupId);
      if (!todaySession) {
        throw new Error('Could not materialize today session');
      }

      return todaySession.id;
    });

    // 7. Navigate directly to attendance session
    await page.evaluate((sId) => {
      window.location.hash = `#/attendance?sessionId=${sId}`;
    }, sessionId);

    const attendancePage = page.locator('[data-testid="page-attendance"]');
    await expect(attendancePage).toBeVisible({ timeout: 10000 });

    // Open Session Reflection Modal
    const openReflectionBtn = page.locator('[data-testid="btn-open-session-reflection"]');
    await expect(openReflectionBtn).toBeVisible({ timeout: 8000 });
    await openReflectionBtn.click();

    const reflectionModal = page.locator('[data-testid="session-reflection-modal"]');
    await expect(reflectionModal).toBeVisible({ timeout: 5000 });

    // Select PARTIALLY_COMPLETED status
    const partialBtn = page.locator('[data-testid="status-option-partially_completed"]');
    await expect(partialBtn).toBeVisible({ timeout: 5000 });
    await partialBtn.click();

    // Select the plan we created
    const planSelect = page.locator('[data-testid="select-lesson-plan"]');
    if (await planSelect.isVisible()) {
      const planOpt = await planSelect.locator('option').nth(1).getAttribute('value');
      if (planOpt) {
        await planSelect.selectOption(planOpt);
      }
    }

    // Fill notes & uncompleted items
    await page.locator('[data-testid="textarea-uncompleted-items"]').fill('تبقى تمرين الامتحان التجريبي على الدوال اللوغاريتمية');
    await page.locator('[data-testid="textarea-topics-review"]').fill('مراجعة سريعة لقاعدة مشتقة دالة المقلوب');
    await page.locator('[data-testid="textarea-quick-notes"]').fill('تفاعل الطلاب ممتاز واستيعاب كامل لقاعدة السلسلة');

    await page.waitForTimeout(500);

    // Capture 03: Session Reflection Workflow Modal with Completion Status
    const shot03 = path.join(screenshotsDir, '03-session-reflection-modal.png');
    await page.screenshot({ path: shot03, fullPage: true });

    // Save the Reflection (Freezes snapshot!)
    await page.locator('[data-testid="btn-save-reflection"]').click();
    await expect(reflectionModal).toBeHidden({ timeout: 6000 });

    // 8. Re-open Reflection Modal to verify immutable historical snapshot preservation
    await openReflectionBtn.click();
    await expect(reflectionModal).toBeVisible({ timeout: 5000 });

    const snapshotCard = page.locator('[data-testid="reflection-snapshot-card"]');
    await expect(snapshotCard).toBeVisible({ timeout: 5000 });

    // Expand snapshot details
    const toggleSnapshotBtn = page.locator('[data-testid="toggle-snapshot-detail-btn"]');
    await expect(toggleSnapshotBtn).toBeVisible({ timeout: 5000 });
    await toggleSnapshotBtn.click();

    await page.waitForTimeout(600);

    // Capture 04: Historical Reflection Snapshot View with Immutable Taught Plan Content
    const shot04 = path.join(screenshotsDir, '04-session-reflection-snapshot-view.png');
    await page.screenshot({ path: shot04, fullPage: true });

    // Close reflection modal
    await page.locator('button[aria-label="إغلاق"]').first().click();

    // Copy screenshots to docs directory
    for (const file of [
      '01-lesson-planner-authoring.png',
      '02-lesson-planner-timing-calculator.png',
      '03-session-reflection-modal.png',
      '04-session-reflection-snapshot-view.png',
    ]) {
      const src = path.join(screenshotsDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(docsDir, file));
      }
    }
  });
});
