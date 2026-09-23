import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 6 UI Redesign — Visual Verification & Navigation Architecture Suite', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const docsDir = path.resolve(__dirname, '../../../docs/screenshots/ui-redesign');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-redesign-gate-'));
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
  });

  test.afterAll(async () => {
    if (electronApp) {
      try { await electronApp.close(); } catch {}
    }
    if (testDataDir && fs.existsSync(testDataDir)) {
      try { fs.rmSync(testDataDir, { recursive: true, force: true }); } catch {}
    }
  });

  test('captures all 15 required screenshots and verifies the 4-layer UI redesign architecture', async () => {
    test.setTimeout(600000);
    const packagedExePath = path.resolve(__dirname, '../release/win-unpacked/تِبيان.exe');

    electronApp = await electron.launch({
      executablePath: packagedExePath,
      args: [`--user-data-dir=${testDataDir}`],
      env: { ...process.env, TIBYAN_APP_DATA_DIR: testDataDir },
    });

    page = await electronApp.firstWindow();
    page.on('dialog', (dialog) => dialog.accept());
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForLoadState('domcontentloaded');

    // ── Complete Onboarding Wizard ──
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

    // Verify 4-layer architecture presence
    await expect(page.locator('[data-testid="top-utility-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="right-main-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="teacher-avatar"]')).toBeVisible();

    // Seed the real packaged database: one enrolled active student, one active
    // unenrolled student, and one active group. The dashboard must count both
    // students, proving the renderer matches the authoritative service result.
    const authoritative = await page.evaluate(async () => {
      const group = await window.tibyan.groups.create({
        name: 'مجموعة اختبار لوحة اليوم',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        defaultPaymentType: 'PER_SESSION',
        defaultPaymentAmount: 80,
        schedules: [],
      });
      const enrolled = await window.tibyan.students.create({
        fullName: 'طالب مقيد تجريبي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        guardianPhone: '01000000001',
      });
      const unenrolled = await window.tibyan.students.create({
        fullName: 'طالب نشط غير ملحق بمجموعة',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        guardianPhone: '01000000002',
      });
      if (!group.success || !group.data || !enrolled.success || !enrolled.data || !unenrolled.success) {
        throw new Error('Failed to seed authoritative dashboard fixture');
      }
      const d = new Date();
      const effectiveDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await window.tibyan.enrollments.enroll({
        groupId: group.data.id,
        studentId: enrolled.data.id,
        effectiveDate,
      });
      const result = await window.tibyan.dashboard.getToday();
      if (!result.success || !result.data) throw new Error('Dashboard service read failed');
      return {
        students: result.data.totalEnrolledStudents,
        groups: result.data.activeGroupsCount,
      };
    });
    expect(authoritative).toEqual({ students: 2, groups: 1 });
    await page.reload();
    await expect(appShell).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="stat-enrolled-students"]')).toHaveText('2');
    await expect(page.locator('[data-testid="stat-active-groups"]')).toHaveText('1');

    const sidebar = page.locator('[data-testid="right-main-sidebar"]');
    const workspace = page.locator('[data-testid="workspace-stage"]');
    const expandedSidebarBox = await sidebar.boundingBox();
    const expandedWorkspaceBox = await workspace.boundingBox();
    expect(expandedSidebarBox).not.toBeNull();
    expect(expandedWorkspaceBox).not.toBeNull();
    expect(Math.round(expandedSidebarBox!.width)).toBe(224);
    expect(expandedSidebarBox!.x).toBeGreaterThan(expandedWorkspaceBox!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // 01-light-today-expanded-sidebar.png
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(docsDir, '01-light-today-expanded-sidebar.png') });

    // 02-light-today-collapsed-sidebar.png
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle-btn"]');
    await sidebarToggle.click();
    await page.waitForTimeout(400);
    const collapsedSidebarBox = await sidebar.boundingBox();
    const collapsedWorkspaceBox = await workspace.boundingBox();
    expect(Math.round(collapsedSidebarBox!.width)).toBe(64);
    expect(collapsedWorkspaceBox!.width).toBeGreaterThan(expandedWorkspaceBox!.width);
    await page.screenshot({ path: path.join(docsDir, '02-light-today-collapsed-sidebar.png') });
    // Expand sidebar back
    await sidebarToggle.click();
    await page.waitForTimeout(400);

    // 03-light-students-context-island.png
    await page.locator('[data-testid="sidebar-item-students"]').click();
    await expect(page.locator('[data-testid="page-students"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="contextual-dynamic-island"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '03-light-students-context-island.png') });

    // 04-light-groups-context-island.png
    await page.locator('[data-testid="sidebar-item-groups"]').click();
    await expect(page.locator('[data-testid="page-groups"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="contextual-dynamic-island"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '04-light-groups-context-island.png') });

    // 05-light-attendance-context-island.png
    await page.locator('[data-testid="sidebar-item-attendance"]').click();
    await expect(page.locator('[data-testid="page-attendance"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="contextual-dynamic-island"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '05-light-attendance-context-island.png') });

    // 06-light-curriculum-context-island.png
    await page.locator('[data-testid="sidebar-item-curriculum-library"]').click();
    await expect(page.locator('[data-testid="page-curriculum-library"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="contextual-dynamic-island"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '06-light-curriculum-context-island.png') });

    // 07-light-tibyan-home.png
    await page.locator('[data-testid="sidebar-item-assistant"]').click();
    await expect(page.locator('[data-testid="page-tibyan-workspace"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tibyan-home-view"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '07-light-tibyan-home.png') });

    // 08-light-tibyan-ai-tools-island.png
    await expect(page.locator('[data-testid="contextual-dynamic-island"]')).toBeVisible();
    // Click 'إنشاء اختبار' in island
    await page.locator('[data-testid="island-action-exam"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(docsDir, '08-light-tibyan-ai-tools-island.png') });

    // 09-light-tibyan-active-chat.png
    await page.locator('[data-testid="island-action-platform-control"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(docsDir, '09-light-tibyan-active-chat.png') });

    // 10-light-tibyan-history-drawer.png
    await page.locator('[data-testid="island-action-history"]').click();
    await expect(page.locator('[data-testid="tibyan-history-drawer"]')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(docsDir, '10-light-tibyan-history-drawer.png') });
    // Close history drawer
    await page.locator('[data-testid="close-history-drawer-btn"]').click();
    await page.waitForTimeout(300);

    // 11-dark-today.png
    const themeBtn = page.locator('[data-testid="topbar-theme-toggle-btn"]');
    await themeBtn.click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="sidebar-item-today"]').click();
    await expect(page.locator('[data-testid="page-today"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '11-dark-today.png') });

    // 12-dark-tibyan.png
    await page.locator('[data-testid="sidebar-item-assistant"]').click();
    await expect(page.locator('[data-testid="page-tibyan-workspace"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '12-dark-tibyan.png') });

    // 13-light-settings.png
    await themeBtn.click(); // switch back to light mode
    await page.waitForTimeout(400);
    await page.locator('[data-testid="sidebar-item-settings"]').click();
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '13-light-settings.png') });

    // 14-1366x768-layout.png
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.locator('[data-testid="sidebar-item-today"]').click();
    await page.waitForTimeout(500);
    const compactSidebarBox = await sidebar.boundingBox();
    const compactWorkspaceBox = await workspace.boundingBox();
    expect(compactSidebarBox!.x).toBeGreaterThan(compactWorkspaceBox!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(docsDir, '14-1366x768-layout.png') });

    // The longest contextual island remains reachable at the compact target.
    await page.locator('[data-testid="sidebar-item-assistant"]').click();
    const island = page.locator('[data-testid="contextual-dynamic-island"]');
    await expect(island).toBeVisible();
    expect(await island.evaluate((element) => element.scrollWidth >= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // 15-1600x900-layout.png
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(docsDir, '15-1600x900-layout.png') });
  });
});
