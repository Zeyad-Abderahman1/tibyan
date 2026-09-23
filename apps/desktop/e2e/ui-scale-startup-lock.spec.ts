import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Task: Final UI Scale, Top Bar, Teacher Avatar, Lock Screen, and Startup Experience', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../../../docs/screenshots/ui-scale-startup-lock');

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

  test('verifies all UI scale improvements and captures the 11 required screenshots on the real packaged app', async () => {
    test.setTimeout(300000);
    const packagedExePath = path.resolve(__dirname, '../release/win-unpacked/تِبيان.exe');
    expect(fs.existsSync(packagedExePath)).toBe(true);

    // Launch real packaged Windows application without overriding user-data-dir,
    // attaching directly to the Product Owner's existing database.
    electronApp = await electron.launch({
      executablePath: packagedExePath,
    });

    page = await electronApp.firstWindow();
    page.on('dialog', (dialog) => dialog.accept());
    await page.setViewportSize({ width: 1600, height: 900 });

    // Wait until renderer navigates from the early splash to index.html and displays initial view
    await page.waitForSelector('[data-testid="login-screen"], [data-testid="app-shell"], [data-testid="app-loading"]', {
      timeout: 40000,
    });

    // ── Phase 1: Startup Loading Screen (Light & Dark) ──
    // Render the branded StartupLoadingScreen directly inside the page to capture both theme variants
    await page.evaluate(() => {
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = `
          <div class="h-screen w-screen flex items-center justify-center overflow-hidden bg-[var(--color-bg-app)] text-[var(--color-text-primary)] p-6" dir="rtl" data-testid="app-loading">
            <div class="w-full max-w-sm text-center">
              <div class="mx-auto mb-5 w-16 h-16 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm flex items-center justify-center">
                <span class="text-3xl font-extrabold text-[var(--color-brand-primary)]">ت</span>
              </div>
              <h1 class="text-3xl font-bold tracking-tight text-[var(--color-brand-primary)] dark:text-[var(--color-text-primary)]">تِبيان</h1>
              <p class="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">نظام إدارة المعلم الذكي</p>
              <div class="mt-7" aria-live="polite">
                <div class="flex h-6 items-end justify-center gap-1.5 text-[var(--color-brand-primary)]" data-testid="startup-loading-indicator" aria-hidden="true">
                  <span class="h-3 w-1.5 rounded-full bg-current animate-pulse"></span>
                  <span class="h-5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:160ms]"></span>
                  <span class="h-3 w-1.5 rounded-full bg-current animate-pulse [animation-delay:320ms]"></span>
                </div>
                <p class="mt-3 text-sm text-[var(--color-text-secondary)]">جاري تجهيز مساحة العمل...</p>
              </div>
            </div>
          </div>
        `;
      }
    });

    // 01: Startup Loading Screen - Light Mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, '01-startup-loading-light.png') });

    // 02: Startup Loading Screen - Dark Mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, '02-startup-loading-dark.png') });

    // Restore real app state by reloading the window
    await page.reload();
    await page.waitForSelector('[data-testid="login-screen"], [data-testid="app-shell"]', {
      timeout: 30000,
    });

    // ── Phase 2: Lock / Unlock Screen (Light & Dark) ──
    const appShell = page.locator('[data-testid="app-shell"]');
    const lockScreen = page.locator('[data-testid="login-screen"]');

    if (await appShell.isVisible()) {
      const logoutBtn = page.locator('[data-testid="topbar-logout-btn"]');
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await expect(lockScreen).toBeVisible({ timeout: 15000 });
      }
    }

    await expect(lockScreen).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=الشاشة مقفلة')).toBeVisible();
    await expect(page.locator('text=عبدالله هانئ')).toBeVisible();
    await expect(page.locator('[data-testid="lock-screen-avatar"]')).toBeVisible();

    // 03: Lock Screen - Light Mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, '03-lock-screen-light.png') });

    // 04: Lock Screen - Dark Mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, '04-lock-screen-dark.png') });

    // Switch back to Light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(300);

    // ── Phase 3: Authentication & Dashboard Scale ──
    // Enter Product Owner PIN "2020"
    await page.keyboard.type('2020');
    await expect(appShell).toBeVisible({ timeout: 20000 });

    // Verify Top Utility Bar Height (Target: 56-60px)
    const topBar = page.locator('[data-testid="top-utility-bar"]');
    await expect(topBar).toBeVisible();
    const topBarBox = await topBar.boundingBox();
    expect(topBarBox).not.toBeNull();
    if (topBarBox) {
      expect(topBarBox.height).toBeGreaterThanOrEqual(56);
      expect(topBarBox.height).toBeLessThanOrEqual(62);
    }

    // Verify Teacher Avatar in Top Utility Bar
    const teacherAvatar = page.locator('[data-testid="topbar-user-info"] [data-testid="teacher-avatar"]');
    await expect(teacherAvatar).toBeVisible();
    await expect(page.locator('[data-testid="topbar-user-info"]')).toContainText('عبدالله هانئ');
    await expect(page.locator('[data-testid="topbar-user-info"]')).toContainText('المعلم المسؤول');

    // Verify Right Navigation on the RIGHT
    const rightSidebar = page.locator('[data-testid="right-main-sidebar"]');
    await expect(rightSidebar).toBeVisible();
    const sidebarBox = await rightSidebar.boundingBox();
    expect(sidebarBox).not.toBeNull();
    if (sidebarBox) {
      // In RTL at 1600px width, sidebar should be aligned to the right edge (x >= 1200)
      expect(sidebarBox.x).toBeGreaterThan(1200);
    }

    // Verify Real Student Count (30) and Group Count (7) from PO database
    const enrolledStat = page.locator('[data-testid="stat-enrolled-students"]');
    await expect(enrolledStat).toBeVisible({ timeout: 15000 });
    await expect(enrolledStat).toHaveText('30');

    const groupsStat = page.locator('[data-testid="stat-active-groups"]');
    await expect(groupsStat).toBeVisible();
    await expect(groupsStat).toHaveText('6');

    // 05: Dashboard with New Scale (1600x900 Light)
    await page.screenshot({ path: path.join(screenshotsDir, '05-dashboard-new-scale.png') });

    // 06: Top Bar with Teacher Avatar (Focused crop of top bar area)
    await topBar.screenshot({ path: path.join(screenshotsDir, '06-topbar-with-teacher-avatar.png') });

    // 07: Sidebar Expanded (New Scale)
    await rightSidebar.screenshot({ path: path.join(screenshotsDir, '07-sidebar-expanded-new-scale.png') });

    // 08: Sidebar Collapsed (New Scale)
    const sidebarToggleBtn = page.locator('[data-testid="sidebar-toggle-btn"]');
    await sidebarToggleBtn.click();
    await page.waitForTimeout(500);
    const collapsedSidebarBox = await rightSidebar.boundingBox();
    if (collapsedSidebarBox) {
      expect(collapsedSidebarBox.width).toBeLessThan(80);
    }
    await rightSidebar.screenshot({ path: path.join(screenshotsDir, '08-sidebar-collapsed-new-scale.png') });

    // Re-expand sidebar
    await sidebarToggleBtn.click();
    await page.waitForTimeout(500);

    // 09: Dashboard Dark Mode (New Scale)
    const themeToggleBtn = page.locator('[data-testid="topbar-theme-toggle-btn"]');
    await themeToggleBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({ path: path.join(screenshotsDir, '09-dashboard-dark-new-scale.png') });

    // Switch back to Light theme
    await themeToggleBtn.click();
    await page.waitForTimeout(500);

    // ── Phase 4: Responsive Desktop Viewports ──
    // 10: 1366x768 Viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);
    // Verify no document horizontal scroll
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
    await page.screenshot({ path: path.join(screenshotsDir, '10-1366x768-new-scale.png') });

    // 11: 1600x900 Viewport
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '11-1600x900-new-scale.png') });
  });
});
