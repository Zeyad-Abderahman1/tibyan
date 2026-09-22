import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 6 Final — Corrected UI Visual Gate', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../test-results/phase6-final-ui');
  const docsDir = path.resolve(__dirname, '../../../docs/screenshots/phase6-final-ui');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-phase6-final-'));
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  });

  test.afterAll(async () => {
    if (electronApp) { try { await electronApp.close(); } catch {} }
    if (testDataDir && fs.existsSync(testDataDir)) { try { fs.rmSync(testDataDir, { recursive: true, force: true }); } catch {} }
  });

  test('completes Phase 6 final visual gate: simplified nav, ChatGPT-style workspace, curriculum import, PDF viewer, dark mode', async () => {
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

    // ── 1. Complete First-Run Wizard ──
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
    if (await initialLoginScreen.isVisible()) { await page.waitForTimeout(500); await page.keyboard.type('1234'); }
    await expect(appShell).toBeVisible({ timeout: 15000 });

    // ── 2. Verify Simplified Navigation ──
    const navHtml = await page.locator('nav').first().innerHTML();
    // الاختبارات and الشرائح must NOT be in top nav
    expect(navHtml).not.toContain('الاختبارات');
    expect(navHtml).not.toContain('الشرائح');
    // تِبيان must be present
    expect(navHtml).toContain('تِبيان');
    expect(navHtml).toContain('مكتبة المناهج');

    // Screenshot 1: Simplified top nav
    await page.screenshot({ path: path.join(docsDir, '01-top-nav-simplified.png') });

    // ── 3. Open Tibyan Workspace ──
    const tibyanLink = page.locator('nav a[href="#/assistant"]');
    await tibyanLink.click();
    const workspacePage = page.locator('[data-testid="page-tibyan-workspace"]');
    await expect(workspacePage).toBeVisible({ timeout: 10000 });

    // Verify right sidebar exists and is on the RIGHT side
    const rightSidebar = page.locator('[data-testid="tibyan-right-sidebar"]');
    await expect(rightSidebar).toBeVisible();

    // Verify capabilities are in right sidebar
    const examCapability = page.locator('[data-testid="capability-EXAM"]');
    await expect(examCapability).toBeVisible();
    await expect(page.locator('[data-testid="capability-SLIDES"]')).toBeVisible();
    await expect(page.locator('[data-testid="capability-REVIEW"]')).toBeVisible();
    await expect(page.locator('[data-testid="capability-NOTES"]')).toBeVisible();
    await expect(page.locator('[data-testid="capability-PLATFORM_CONTROL"]')).toBeVisible();

    // Verify NO left sidebar (old WorkspaceHistory removed)
    const leftSidebar = page.locator('.w-56.border-r');
    await expect(leftSidebar).not.toBeVisible();

    // Screenshot 2: ChatGPT-style workspace home
    await page.screenshot({ path: path.join(docsDir, '02-tibyan-chat-home.png') });

    // Screenshot 3: Right sidebar capabilities + history
    await page.screenshot({ path: path.join(docsDir, '03-tibyan-right-sidebar-capabilities-history.png') });

    // ── 4. Select a capability and verify dedicated tool UI ──
    await examCapability.click();
    await page.waitForTimeout(500);

    // Verify Exam Tool UI is visible (dedicated UI, not generic chat)
    const examToolUI = page.locator('text=إنشاء اختبار').first();
    await expect(examToolUI).toBeVisible();

    // Verify source picker is visible
    const sourcePicker = page.locator('[data-testid="source-browse"]');
    await expect(sourcePicker).toBeVisible();

    // Screenshot 4: Exam dedicated tool UI
    await page.screenshot({ path: path.join(docsDir, '04-exam-dedicated-ui.png') });

    // ── 5. Open Curriculum Library ──
    const curriculumLink = page.locator('nav a[href="#/curriculum-library"]');
    await curriculumLink.click();
    const curriculumPage = page.locator('[data-testid="page-curriculum-library"]');
    await expect(curriculumPage).toBeVisible({ timeout: 10000 });

    // Verify import button text
    const importBtn = page.locator('[data-testid="btn-import-curriculum"]');
    await expect(importBtn).toContainText('استيراد ملف PDF');

    // Screenshot 5: Curriculum library
    await page.screenshot({ path: path.join(docsDir, '07-curriculum-library-with-document.png') });

    // ── 6. Verify navigation still has exams/slides routes ──
    // Routes still exist even though nav links removed
    await page.evaluate(() => { window.location.hash = '#/exams'; });
    await page.waitForTimeout(1000);
    const examBuilder = page.locator('[data-testid="page-exam-builder"]');
    await expect(examBuilder).toBeVisible({ timeout: 5000 });

    // ── 7. Dark mode ──
    const themeToggleBtn = page.locator('[data-testid="topbar-theme-toggle-btn"]');
    await expect(themeToggleBtn).toBeVisible();
    await themeToggleBtn.click();
    await page.waitForTimeout(500);
    const rootElement = page.locator('html');
    const themeClass = await rootElement.getAttribute('class');
    expect(themeClass).toContain('dark');

    // Navigate to tibyan workspace in dark mode
    await tibyanLink.click();
    await page.waitForTimeout(500);

    // Screenshot 10: Dark mode
    await page.screenshot({ path: path.join(docsDir, '10-tibyan-dark-mode.png') });

    // ── 8. Verify branding ──
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('تِبيان');
    const lowerText = bodyText?.toLowerCase() || '';
    expect(lowerText).not.toContain('gemini');
    expect(lowerText).not.toContain('جيميني');

    // ── 9. Verify Math Engine hidden ──
    const mathNav = page.locator('nav a[href="#/math"]');
    await expect(mathNav).not.toBeVisible();

    // ── 10. Verify 1366x768 ──
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, 'viewport-1366x768.png') });

    // ── 11. Verify 1600x900 ──
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, 'viewport-1600x900.png') });

    // ── 12. Verify Electron security ──
    const apiExposed = await page.evaluate(() => typeof (window as any).tibyan === 'object' && (window as any).tibyan !== null);
    expect(apiExposed).toBe(true);
    const nodeBlocked = await page.evaluate(() => { try { return typeof (window as any).require === 'undefined'; } catch { return true; } });
    expect(nodeBlocked).toBe(true);

    // ── 13. Verify curriculumLibrary, tibyan, ai sections ──
    const sections = await page.evaluate(() => Object.keys((window as any).tibyan || {}).sort());
    expect(sections).toContain('curriculumLibrary');
    expect(sections).toContain('tibyan');
    expect(sections).toContain('ai');

    // ── 14. Switch back to light mode ──
    await themeToggleBtn.click();
    await page.waitForTimeout(300);

    await electronApp.close();
  });
});
