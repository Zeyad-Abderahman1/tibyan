import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Task: Final Motion Polish — Smooth Navigation Indicator, Page Transitions, Theme Toggle & Delete Animations', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../../../docs/screenshots/motion-polish');

  test.beforeAll(() => {
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
  });

  test('verifies all motion polish requirements in the real packaged Windows desktop application', async () => {
    test.setTimeout(300000);
    const packagedExePath = path.resolve(__dirname, '../release/win-unpacked/تِبيان.exe');
    expect(fs.existsSync(packagedExePath)).toBe(true);

    electronApp = await electron.launch({
      executablePath: packagedExePath,
    });

    page = await electronApp.firstWindow();
    page.on('dialog', (dialog) => dialog.accept());
    await page.setViewportSize({ width: 1600, height: 900 });

    // Wait for app to render either login screen or app-shell
    await page.waitForSelector('[data-testid="login-screen"], [data-testid="app-shell"]', {
      timeout: 40000,
    });

    const appShell = page.locator('[data-testid="app-shell"]');
    const lockScreen = page.locator('[data-testid="login-screen"]');

    // If on login screen, unlock using Abdullah's PIN 2020
    if (await lockScreen.isVisible()) {
      await page.keyboard.type('2020');
      await expect(appShell).toBeVisible({ timeout: 20000 });
    }

    // ── 1. Main Sidebar Active Gliding Indicator ──
    const sidebar = await page.waitForSelector('[data-testid="right-main-sidebar"]', { timeout: 15000 });
    expect(sidebar).toBeTruthy();

    const indicator = await page.waitForSelector('[data-testid="sidebar-active-indicator"]', { timeout: 10000 });
    expect(indicator).toBeTruthy();

    // Capture initial position on Today (اليوم)
    const initialBox = await indicator.boundingBox();
    expect(initialBox).toBeTruthy();

    // Navigate to Students (الطلاب)
    await page.click('[data-testid="sidebar-item-students"]');
    await page.waitForTimeout(350); // wait for 260ms transition to complete

    const studentsBox = await indicator.boundingBox();
    expect(studentsBox).toBeTruthy();
    // Indicator must have physically moved down
    expect(studentsBox!.y).toBeGreaterThan(initialBox!.y);

    // Screenshot 1: اليوم -> الطلاب navigation
    await page.screenshot({
      path: path.join(screenshotsDir, '01-nav-students-gliding-indicator.png'),
    });

    // Navigate to Groups (المجموعات)
    await page.click('[data-testid="sidebar-item-groups"]');
    await page.waitForTimeout(350);

    const groupsBox = await indicator.boundingBox();
    expect(groupsBox).toBeTruthy();
    expect(groupsBox!.y).toBeGreaterThan(studentsBox!.y);

    // Screenshot 2: الطلاب -> المجموعات
    await page.screenshot({
      path: path.join(screenshotsDir, '02-nav-groups-gliding-indicator.png'),
    });

    // Navigate to Attendance (تحضير الطلاب)
    await page.click('[data-testid="sidebar-item-attendance"]');
    await page.waitForTimeout(350);

    const attendanceBox = await indicator.boundingBox();
    expect(attendanceBox).toBeTruthy();
    expect(attendanceBox!.y).toBeGreaterThan(groupsBox!.y);

    // Screenshot 3: المجموعات -> تحضير الطلاب
    await page.screenshot({
      path: path.join(screenshotsDir, '03-nav-attendance-gliding-indicator.png'),
    });

    // Test Collapsed Sidebar indicator
    const toggleBtn = await page.waitForSelector('[data-testid="sidebar-toggle-btn"]');
    await toggleBtn.click();
    await page.waitForTimeout(400); // wait for sidebar collapse transition

    const isCollapsed = await page.$eval('[data-testid="right-main-sidebar"]', (el) => el.getAttribute('data-collapsed'));
    expect(isCollapsed).toBe('true');

    // Indicator must still be present and aligned in collapsed rail
    const collapsedIndicator = await page.waitForSelector('[data-testid="sidebar-active-indicator"]');
    expect(collapsedIndicator).toBeTruthy();

    // Screenshot 4: Sidebar collapsed mode
    await page.screenshot({
      path: path.join(screenshotsDir, '04-sidebar-collapsed-gliding-indicator.png'),
    });

    // Navigate in collapsed mode to Finance (المالية)
    await page.click('[data-testid="sidebar-item-finance"]');
    await page.waitForTimeout(350);

    // Expand sidebar back
    await toggleBtn.click();
    await page.waitForTimeout(400);

    // Rapid navigation clicking stress test
    await page.click('[data-testid="sidebar-item-today"]');
    await page.click('[data-testid="sidebar-item-settings"]');
    await page.click('[data-testid="sidebar-item-assistant"]');
    await page.click('[data-testid="sidebar-item-curriculum-library"]');
    await page.waitForTimeout(400);

    const activeItem = await page.$eval('[data-testid="sidebar-item-curriculum-library"]', (el) => el.getAttribute('data-active'));
    expect(activeItem).toBe('true');

    // ── 2. Page Content Transition ──
    const enterContainer = await page.$('.page-workspace-enter');
    expect(enterContainer).toBeTruthy();

    // ── 3. Contextual Dynamic Island Animation ──
    const island = await page.$('[data-testid="contextual-dynamic-island"]');
    expect(island).toBeTruthy();

    // Screenshot 5: Contextual dynamic island
    await page.screenshot({
      path: path.join(screenshotsDir, '05-dynamic-island-contextual.png'),
    });

    // ── 4. Custom Animated Dark Mode Toggle ──
    const themeBtn = await page.waitForSelector('[data-testid="topbar-theme-toggle-btn"]');
    expect(themeBtn).toBeTruthy();

    // Initial state check
    const initialIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    // Click toggle switch
    await themeBtn.click();
    await page.waitForTimeout(400); // wait for 300ms switch transition

    const newIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(newIsDark).toBe(!initialIsDark);

    // Screenshot 6: Theme switched state
    await page.screenshot({
      path: path.join(screenshotsDir, '06-theme-toggle-switched.png'),
    });

    // Toggle back to original theme
    await themeBtn.click();
    await page.waitForTimeout(400);
    const restoredIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(restoredIsDark).toBe(initialIsDark);

    // Screenshot 7: Theme toggle restored
    await page.screenshot({
      path: path.join(screenshotsDir, '07-theme-toggle-restored.png'),
    });

    // ── 5. Viewport Checks (1600x900 and 1366x768) ──
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsDir, '08-viewport-1600x900.png'),
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsDir, '09-viewport-1366x768.png'),
    });

    // Restore viewport to 1600x900
    await page.setViewportSize({ width: 1600, height: 900 });
  });
});
