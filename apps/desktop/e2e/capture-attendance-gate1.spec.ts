import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Attendance Visual Approval Gate 1', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = 'C:\\Users\\zeyad mohamed\\.gemini\\antigravity-ide\\brain\\d706cd3a-84a5-4152-b094-7a238e59f5ec\\screenshots';

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-attendance-gate1-'));
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

  test('captures Attendance Main Workspace at 1920x1080 and 1366x768 in Light & Dark modes', async () => {
    test.setTimeout(90000);
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

    // 2. Populate test Group, Students, Schedule and Materialize today session via window.tibyan
    const sessionId = await page.evaluate(async () => {
      const todayWeekday = new Date().getDay();

      // Create Group with schedule
      const groupRes = await window.tibyan.groups.create({
        name: 'مجموعة المتفوقين — الصف الثاني الثانوي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        defaultPaymentType: 'PER_SESSION',
        defaultPaymentAmount: 80,
        schedules: [
          {
            weekday: todayWeekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            startTime: '16:00',
            durationMinutes: 90,
          },
        ],
      });
      if (!groupRes.success || !groupRes.data) {
        throw new Error('Create group failed: ' + JSON.stringify(groupRes));
      }
      const groupId = groupRes.data.id;

      // Create 4 students
      const s1 = await window.tibyan.students.create({
        fullName: 'زياد محمد عبد الله',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      });
      const s2 = await window.tibyan.students.create({
        fullName: 'عمر خالد الشافعي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        guardianPhone: '01123456789',
      });
      const s3 = await window.tibyan.students.create({
        fullName: 'مريم أحمد يوسف',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        guardianPhone: '01234567890',
      });
      const s4 = await window.tibyan.students.create({
        fullName: 'يوسف محمود النجار',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        guardianPhone: '01512345678',
      });

      // Enroll students using local wall-clock date matching DefaultDateProvider
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const effectiveDate = `${year}-${month}-${day}`;
      await window.tibyan.enrollments.enroll({ groupId, studentId: s1.data!.id, effectiveDate });
      await window.tibyan.enrollments.enroll({ groupId, studentId: s2.data!.id, effectiveDate });
      await window.tibyan.enrollments.enroll({ groupId, studentId: s3.data!.id, effectiveDate });
      await window.tibyan.enrollments.enroll({ groupId, studentId: s4.data!.id, effectiveDate });

      // Materialize sessions
      await window.tibyan.sessions.materializeRollingSessions();

      // List today's sessions
      const sessionsRes = await window.tibyan.sessions.listByRange({
        startDate: effectiveDate,
        endDate: effectiveDate,
      });

      const todaySession = sessionsRes.data && sessionsRes.data[0];
      if (!todaySession) {
        throw new Error('Failed to materialize today session');
      }

      // Record varied attendance
      await window.tibyan.attendance.record({
        sessionId: todaySession.id,
        studentId: s1.data!.id,
        status: 'PRESENT',
      });
      await window.tibyan.attendance.record({
        sessionId: todaySession.id,
        studentId: s2.data!.id,
        status: 'LATE',
        arrivalTime: '16:15',
      });
      await window.tibyan.attendance.record({
        sessionId: todaySession.id,
        studentId: s3.data!.id,
        status: 'EXCUSED',
      });
      // s4 remains UNMARKED

      return todaySession.id;
    });

    // 3. Navigate directly to attendance session
    await page.evaluate((sId) => {
      window.location.hash = `#/attendance?sessionId=${sId}`;
    }, sessionId);

    const attendancePage = page.locator('[data-testid="page-attendance"]');
    await expect(attendancePage).toBeVisible({ timeout: 15000 });
    const rosterTable = page.locator('[data-testid="attendance-roster-table"]');
    await expect(rosterTable).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // 4. Capture 1920x1080 Light Mode
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(600);
    const lightPath1920 = path.join(screenshotsDir, 'attendance-1920x1080-light.png');
    await page.screenshot({ path: lightPath1920, fullPage: true });

    // 5. Capture 1920x1080 Dark Mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(600);
    const darkPath1920 = path.join(screenshotsDir, 'attendance-1920x1080-dark.png');
    await page.screenshot({ path: darkPath1920, fullPage: true });

    // 6. Capture 1366x768 Dark Mode
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(600);
    const darkPath1366 = path.join(screenshotsDir, 'attendance-1366x768-dark.png');
    await page.screenshot({ path: darkPath1366, fullPage: true });

    // 7. Capture 1366x768 Light Mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(600);
    const lightPath1366 = path.join(screenshotsDir, 'attendance-1366x768-light.png');
    await page.screenshot({ path: lightPath1366, fullPage: true });
  });
});
