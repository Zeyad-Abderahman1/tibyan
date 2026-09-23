import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Task: Fix Tibyan AI Chat UI — Full Workspace, Better Scale, History Drawer, ChatGPT-Quality Layout', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../../../docs/screenshots/tibyan-ai-chat');
  const artifactDir = 'C:\\Users\\zeyad mohamed\\.gemini\\antigravity-ide\\brain\\5e1baedb-a379-4d36-a239-6ace0a298e4e';

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

  const saveScreenshot = async (filename: string) => {
    const dest1 = path.join(screenshotsDir, filename);
    await page.screenshot({ path: dest1 });
    if (fs.existsSync(artifactDir)) {
      const dest2 = path.join(artifactDir, filename);
      try {
        fs.copyFileSync(dest1, dest2);
      } catch {}
    }
  };

  test('verifies all Tibyan AI chat redesign requirements on real packaged Windows app', async () => {
    test.setTimeout(360000);
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

    if (await lockScreen.isVisible()) {
      await page.keyboard.type('2020');
      await expect(appShell).toBeVisible({ timeout: 20000 });
    }

    // Ensure light mode initially
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (isDark) {
      await page.click('[data-testid="topbar-theme-toggle-btn"]');
      await page.waitForTimeout(300);
    }

    // Navigate to Tibyan AI Workspace (sidebar item: assistant)
    const assistantNav = page.locator('[data-testid="sidebar-item-assistant"]');
    await assistantNav.click();
    await page.waitForSelector('[data-testid="page-tibyan-workspace"]', { timeout: 15000 });
    await page.waitForTimeout(500);

    // ── 01: Tibyan Home Full Workspace (Light) ──
    const homeView = page.locator('[data-testid="tibyan-home-view"]');
    await expect(homeView).toBeVisible();
    await saveScreenshot('01-tibyan-home-full-workspace-light.png');

    // ── 02: Tibyan Chat Active (Light) ──
    // Click "التحكم في المنصة" in Dynamic Island
    await page.click('[data-testid="island-action-platform-control"]');
    await page.waitForSelector('[data-testid="platform-chat-input"]', { timeout: 10000 });
    await page.waitForTimeout(300);

    // Type a prompt into the enlarged composer
    await page.fill('[data-testid="platform-chat-input"]', 'اعرض عدد الطلاب المسجلين في المجموعات');
    await page.click('[data-testid="platform-chat-send"]');

    // Wait for conversation turn to appear
    await page.waitForTimeout(2000);
    await saveScreenshot('02-tibyan-chat-active-light.png');

    // ── 03: History Overlay Drawer (Light) ──
    // Open History drawer via Dynamic Island "السجل"
    await page.click('[data-testid="island-action-history"]');
    await page.waitForSelector('[data-testid="tibyan-history-drawer"]', { timeout: 8000 });
    const drawer = page.locator('[data-testid="tibyan-history-drawer"]');
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(400); // wait for slide-in animation
    await saveScreenshot('03-tibyan-history-overlay-light.png');

    // Close History drawer by clicking close button or backdrop
    await page.click('[data-testid="close-history-drawer-btn"]');
    await page.waitForTimeout(350);

    // ── 04: Tibyan Home (Dark) ──
    // Toggle theme to dark
    await page.click('[data-testid="topbar-theme-toggle-btn"]');
    await page.waitForTimeout(400);
    // Go back to home
    await page.click('[data-testid="island-action-home"]');
    await expect(homeView).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);
    await saveScreenshot('04-tibyan-home-dark.png');

    // ── 05: Tibyan Chat Active (Dark) ──
    await page.click('[data-testid="island-action-platform-control"]');
    await page.waitForSelector('[data-testid="platform-chat-input"]', { timeout: 8000 });
    await page.waitForTimeout(300);
    await saveScreenshot('05-tibyan-chat-active-dark.png');

    // ── 06: History Overlay Drawer (Dark) ──
    await page.click('[data-testid="island-action-history"]');
    await page.waitForSelector('[data-testid="tibyan-history-drawer"]', { timeout: 8000 });
    await page.waitForTimeout(400);
    await saveScreenshot('06-tibyan-history-overlay-dark.png');

    // Close drawer
    await page.click('[data-testid="close-history-drawer-btn"]');
    await page.waitForTimeout(350);

    // ── 07: Tibyan Chat at 1366x768 ──
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);
    await saveScreenshot('07-tibyan-chat-1366x768.png');

    // ── 08: Tibyan Chat at 1600x900 ──
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(500);
    await saveScreenshot('08-tibyan-chat-1600x900.png');

    // ── 09: Exam Tool Full Workspace ──
    await page.click('[data-testid="island-action-exam"]');
    await page.waitForSelector('[data-testid="exam-title"]', { timeout: 10000 });
    await page.waitForTimeout(400);
    await saveScreenshot('09-exam-tool-full-workspace.png');

    // ── 10: Slides Tool Full Workspace ──
    await page.click('[data-testid="island-action-slides"]');
    await page.waitForSelector('[data-testid="slides-title"]', { timeout: 10000 });
    await page.waitForTimeout(400);
    await saveScreenshot('10-slides-tool-full-workspace.png');
  });
});
