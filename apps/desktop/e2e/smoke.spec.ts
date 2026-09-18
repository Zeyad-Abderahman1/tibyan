import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Task 17: Production Packaging & Playwright E2E Smoke Suite', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;

  const getLaunchConfig = (appDataDir: string) => {
    const packagedExePath = path.resolve(__dirname, '../release/win-unpacked/تِبيان.exe');
    const isPackaged = process.env.TIBYAN_TEST_PACKAGED !== '0' && fs.existsSync(packagedExePath);

    if (isPackaged) {
      return {
        executablePath: packagedExePath,
        args: [`--user-data-dir=${appDataDir}`],
        env: {
          ...process.env,
          TIBYAN_APP_DATA_DIR: appDataDir,
        },
      };
    }

    return {
      args: [path.resolve(__dirname, '../dist-electron/main.js'), `--user-data-dir=${appDataDir}`],
      env: {
        ...process.env,
        TIBYAN_APP_DATA_DIR: appDataDir,
      },
    };
  };

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-smoke-'));
  });

  test.afterAll(async () => {
    if (electronApp) {
      try {
        await electronApp.close();
      } catch {
        // App might already be closed
      }
    }

    if (testDataDir && fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    }
  });

  test('executes complete desktop lifecycle: setup wizard, app shell, navigation, theme toggle, logout, PIN security, and restart persistence', async () => {
    // ------------------------------------------------------------------------
    // 1. Initial Launch into First-Run Wizard
    // ------------------------------------------------------------------------
    electronApp = await electron.launch(getLaunchConfig(testDataDir));
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    const title = await page.title();
    expect(title).toContain('تِبيان');

    // Verify First-Run Wizard is active
    const wizardStartBtn = page.locator('[data-testid="start-wizard-btn"]');
    await expect(wizardStartBtn).toBeVisible({ timeout: 15000 });
    await wizardStartBtn.click();

    // ------------------------------------------------------------------------
    // 2. Complete Owner Setup Form
    // ------------------------------------------------------------------------
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

    // ------------------------------------------------------------------------
    // 3. Complete Academic Year Setup
    // ------------------------------------------------------------------------
    const yearSubmitBtn = page.locator('[data-testid="submit-year-btn"]');
    await expect(yearSubmitBtn).toBeVisible({ timeout: 15000 });
    await yearSubmitBtn.click();

    // ------------------------------------------------------------------------
    // 4. Finish Wizard and Enter AppShell
    // ------------------------------------------------------------------------
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

    // Verify AppShell rendered
    await expect(appShell).toBeVisible({ timeout: 15000 });

    // Verify active academic year badge in Topbar
    const activeYearDisplay = page.locator('[data-testid="active-year-display"]');
    await expect(activeYearDisplay).toContainText('2026-2027');

    // Verify user info displayed in Topbar
    const userInfo = page.locator('[data-testid="topbar-user-info"]');
    await expect(userInfo).toContainText('الأستاذ أحمد الشريف');

    // ------------------------------------------------------------------------
    // 5. Route Navigation Across All Core Views
    // ------------------------------------------------------------------------
    // Navigate to Students
    const studentsLink = page.locator('nav a[href="#/students"]');
    await studentsLink.click();
    await expect(page.locator('[data-testid="page-students"]')).toBeVisible();

    // Navigate to Groups
    const groupsLink = page.locator('nav a[href="#/groups"]');
    await groupsLink.click();
    await expect(page.locator('[data-testid="page-groups"]')).toBeVisible();

    // Navigate to Settings
    const settingsLink = page.locator('nav a[href="#/settings"]');
    await settingsLink.click();
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();

    // Navigate back to Today Dashboard
    const todayLink = page.locator('nav a[href="#/"]');
    await todayLink.click();
    await expect(page.locator('[data-testid="page-today"]')).toBeVisible();

    // ------------------------------------------------------------------------
    // 6. Theme Toggle Verification
    // ------------------------------------------------------------------------
    const themeToggleBtn = page.locator('[data-testid="topbar-theme-toggle-btn"]');
    await expect(themeToggleBtn).toBeVisible();

    const rootElement = page.locator('html');
    const initialThemeClass = await rootElement.getAttribute('class');

    await themeToggleBtn.click();
    // Wait briefly for DOM theme update
    await page.waitForTimeout(300);
    const updatedThemeClass = await rootElement.getAttribute('class');
    expect(updatedThemeClass).not.toBe(initialThemeClass);

    // ------------------------------------------------------------------------
    // 7. Logout and PIN Security Verification
    // ------------------------------------------------------------------------
    const logoutBtn = page.locator('[data-testid="topbar-logout-btn"]');
    await logoutBtn.click();

    // Verify LoginScreen appears
    const loginScreen = page.locator('[data-testid="login-screen"]');
    await expect(loginScreen).toBeVisible({ timeout: 10000 });

    // Test Invalid PIN rejection
    await page.keyboard.type('9999');
    const errorAlert = page.locator('[data-testid="login-error-msg"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(/Invalid PIN|غير صحيح/);

    // Test Valid PIN authentication
    await page.waitForTimeout(500);
    await page.keyboard.type('1234');
    await expect(appShell).toBeVisible({ timeout: 15000 });

    // ------------------------------------------------------------------------
    // 8. Clean App Shutdown and Relaunch Persistence
    // ------------------------------------------------------------------------
    await electronApp.close();

    // Relaunch using the SAME testDataDir
    const reloadedApp = await electron.launch(getLaunchConfig(testDataDir));
    const reloadedPage = await reloadedApp.firstWindow();
    await reloadedPage.waitForLoadState('domcontentloaded');

    // Setup is completed, so First-Run Wizard must NOT appear
    const wizardOnReload = reloadedPage.locator('[data-testid="start-wizard-btn"]');
    await expect(wizardOnReload).not.toBeVisible();

    // LoginScreen must appear with the created teacher account
    const loginScreenOnReload = reloadedPage.locator('[data-testid="login-screen"]');
    await expect(loginScreenOnReload).toBeVisible({ timeout: 15000 });
    await expect(loginScreenOnReload).toContainText('الأستاذ أحمد الشريف');
    await reloadedPage.waitForTimeout(500);

    // Log in again with valid PIN
    await reloadedPage.keyboard.type('1234');
    const appShellOnReload = reloadedPage.locator('[data-testid="app-shell"]');
    await expect(appShellOnReload).toBeVisible({ timeout: 15000 });
    await expect(reloadedPage.locator('[data-testid="active-year-display"]')).toContainText('2026-2027');

    await reloadedApp.close();
  });
});
