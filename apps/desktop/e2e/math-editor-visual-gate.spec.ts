import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 3 — Task 2: Math-Rich Content Model & Offline Math Editor Visual Gate', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const screenshotsDir = path.resolve(__dirname, '../test-results/math-editor-visual-gate');
  const docsDir = path.resolve(__dirname, '../../../docs/screenshots/phase3-task2');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-math-gate-'));
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

  test('captures full Math Editor workflow: Overview, Symbol Palette, Live Preview, and BiDi Complex Formula', async () => {
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

    // Wait for App shell
    await expect(appShell).toBeVisible({ timeout: 15000 });

    // 2. Navigate to Math Editor
    await page.evaluate(() => {
      window.location.hash = '#/math-editor';
    });

    const mathEditorPage = page.locator('[data-testid="page-math-editor"]');
    await expect(mathEditorPage).toBeVisible({ timeout: 10000 });

    // Verify badges
    await expect(page.locator('[data-testid="badge-offline-katex"]')).toContainText('KaTeX');
    await expect(page.locator('[data-testid="badge-bidi-isolate"]')).toContainText('عزل BiDi');

    // Verify initial KaTeX formula rendered
    const previewColumn = page.locator('[data-testid="preview-column"]');
    await expect(previewColumn.locator('.katex').first()).toBeVisible({ timeout: 8000 });

    // Capture 01: Math Editor Overview
    const shot01 = path.join(screenshotsDir, '01-math-editor-overview.png');
    await page.screenshot({ path: shot01, fullPage: true });

    // 3. Exercise Symbol Palette
    const calculusTab = page.locator('[data-testid="palette-tab-calculus_limits"]');
    if (await calculusTab.isVisible()) {
      await calculusTab.click();
      await page.waitForTimeout(300);
    }

    // Insert an integral symbol
    const intBtn = page.locator('[data-testid="symbol-button-int"]');
    if (await intBtn.isVisible()) {
      await intBtn.click();
      await page.waitForTimeout(300);
    }

    // Switch to Matrices tab
    const matricesTab = page.locator('[data-testid="palette-tab-matrices"]');
    if (await matricesTab.isVisible()) {
      await matricesTab.click();
      await page.waitForTimeout(300);
    }

    // Capture 02: Symbol Palette in Action
    const shot02 = path.join(screenshotsDir, '02-math-editor-symbol-palette.png');
    await page.screenshot({ path: shot02, fullPage: true });

    // 4. Switch to Full Preview Mode
    const previewModeBtn = page.locator('[data-testid="view-mode-preview"]');
    await previewModeBtn.click();
    await page.waitForTimeout(500);

    // Verify full preview KaTeX rendering
    await expect(page.locator('.katex').first()).toBeVisible();

    // Capture 03: Live Preview Mode
    const shot03 = path.join(screenshotsDir, '03-math-editor-live-preview.png');
    await page.screenshot({ path: shot03, fullPage: true });

    // 5. Switch back to Split Mode & Add Complex Secondary Formula with Reordering
    const splitModeBtn = page.locator('[data-testid="view-mode-split"]');
    await splitModeBtn.click();
    await page.waitForTimeout(500);

    // Add a new Math Block
    const addMathBtn = page.locator('[data-testid="add-math-block-btn"]');
    await addMathBtn.click();
    await page.waitForTimeout(300);

    // Find the newly added math block textarea (last one)
    const mathTextareas = page.locator('textarea[data-testid^="textarea-math-"]');
    const count = await mathTextareas.count();
    const lastMathTextarea = mathTextareas.nth(count - 1);

    // Fill representative complex Egyptian secondary formula:
    // f''(x) + 4f'(x) + 4f(x) = 0 and matrix
    await lastMathTextarea.fill(
      '\\frac{d^2 y}{dx^2} + 4\\frac{dy}{dx} + 4y = 0 \\implies y = (c_1 + c_2 x)e^{-2x}'
    );
    await page.waitForTimeout(500);

    // Exercise block reordering: Move newly added block up
    const moveUpBtns = page.locator('button[data-testid^="move-up-"]');
    const moveUpCount = await moveUpBtns.count();
    if (moveUpCount > 0) {
      await moveUpBtns.nth(moveUpCount - 1).click();
      await page.waitForTimeout(300);
    }

    // Save content
    const saveBtn = page.locator('[data-testid="save-content-btn"]');
    await saveBtn.click();
    await page.waitForTimeout(500);

    // Verify serialized output is updated
    const serializedOutput = page.locator('[data-testid="serialized-json-output"]');
    await expect(serializedOutput).toContainText('"version":1');

    // Capture 04: Representative Complex Formula with BiDi Isolation and Reordering
    const shot04 = path.join(screenshotsDir, '04-math-editor-bidi-complex-formula.png');
    await page.screenshot({ path: shot04, fullPage: true });

    // Copy screenshots to docs directory as well
    for (const file of [
      '01-math-editor-overview.png',
      '02-math-editor-symbol-palette.png',
      '03-math-editor-live-preview.png',
      '04-math-editor-bidi-complex-formula.png',
    ]) {
      const src = path.join(screenshotsDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(docsDir, file));
      }
    }
  });
});
