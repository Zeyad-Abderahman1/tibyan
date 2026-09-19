import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 2 — Task 5: Thermal Receipts & ESC/POS Printing Visual Gate Spec', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const artifactDir = 'C:\\Users\\zeyad mohamed\\.gemini\\antigravity-ide\\brain\\d706cd3a-84a5-4152-b094-7a238e59f5ec';
  const screenshotsDir = path.join(artifactDir, 'screenshots');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-thermal-gate-'));
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

  test('captures full Thermal Receipt workflow: Settings, 80mm/58mm Preview, Post-Payment Prompt, History Reprint, and Deterministic ESC/POS Proof', async () => {
    test.setTimeout(120000);
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

    // 1. First-Run Wizard
    const wizardStartBtn = page.locator('[data-testid="start-wizard-btn"]');
    await expect(wizardStartBtn).toBeVisible({ timeout: 25000 });
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

    // 2. Populate Student & Group via window.tibyan
    const seedResult = await page.evaluate(async () => {
      const grpRes = await window.tibyan.groups.create({
        name: 'مجموعة الثانوية العامة - المتفوقين',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        subject: 'اللغة العربية',
        paymentType: 'MONTHLY',
        monthlyRateCents: 30000, // 300 EGP
      });
      const groupId = grpRes.data?.id;

      const sRes = await window.tibyan.students.create({
        fullName: 'عبد الرحمن محمد إبراهيم حسن الشناوي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      });

      if (sRes.success && sRes.data && groupId) {
        await window.tibyan.enrollments.enroll({
          studentId: sRes.data.id,
          groupId,
        });
      }

      return { groupId, student: sRes.data };
    });

    expect(seedResult.student).toBeDefined();

    // 3. Navigate to /finance
    await page.evaluate(() => {
      window.location.hash = '#/finance';
    });

    const financePage = page.locator('[data-testid="page-finance"]');
    await expect(financePage).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // 4. Open Thermal Printer Settings from Finance Header
    const settingsBtn = page.locator('[data-testid="open-thermal-printer-settings-btn"]');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    // Verify Thermal Receipt Settings Modal is open
    const printerSelect = page.locator('[data-testid="printer-select"]');
    await expect(printerSelect).toBeVisible({ timeout: 5000 });

    // Capture 01: Printer settings & selection UI (with 80mm test preview)
    const shot01Path = path.join(screenshotsDir, '01_printer_settings_ui.png');
    await page.screenshot({ path: shot01Path, fullPage: false });

    // Trigger Test Print
    const testPrintBtn = page.locator('[data-testid="test-print-button"]');
    await expect(testPrintBtn).toBeVisible();
    await testPrintBtn.click();
    await page.waitForTimeout(600);

    // Capture 02: Test print feedback & result
    const shot02Path = path.join(screenshotsDir, '02_test_print_result.png');
    await page.screenshot({ path: shot02Path, fullPage: false });

    // Close Settings Modal
    await page.locator('[data-testid="close-thermal-modal-btn"]').click();
    await expect(page.locator('[data-testid="thermal-receipt-modal"]')).toBeHidden({ timeout: 5000 });

    // 5. Open Add Payment Modal for the student
    const recordPayBtn = page.locator('.record-payment-btn').first();
    await expect(recordPayBtn).toBeVisible({ timeout: 5000 });
    await recordPayBtn.click();

    const addPaymentForm = page.locator('[data-testid="add-payment-form"]');
    await expect(addPaymentForm).toBeVisible({ timeout: 5000 });

    // Fill Payment: 300 EGP, Cash, Note
    const amountInput = page.locator('[data-testid="payment-amount-input"]');
    await amountInput.fill('300');
    const notesInput = page.locator('[data-testid="payment-notes-input"]');
    await notesInput.fill('سداد اشتراك الشهر - دفعة مؤكدة');

    const confirmPayBtn = page.locator('[data-testid="confirm-payment-btn"]');
    await confirmPayBtn.click();

    // 6. Post-Payment Thermal Receipt Dialog
    const printReceiptModalBtn = page.locator('[data-testid="print-receipt-modal-button"]');
    await expect(printReceiptModalBtn).toBeVisible({ timeout: 8000 });

    // Capture 03: Post-payment Print Receipt prompt
    const shot03Path = path.join(screenshotsDir, '03_post_payment_receipt_prompt.png');
    await page.screenshot({ path: shot03Path, fullPage: false });

    // Click "طباعة الإيصال الحراري"
    await printReceiptModalBtn.click();
    await page.waitForTimeout(800);

    // 7. Thermal Receipt Modal (80mm preview)
    const btn80mm = page.locator('[data-testid="paper-width-80mm"]');
    await expect(btn80mm).toBeVisible({ timeout: 5000 });

    // Capture 04: 80mm thermal receipt preview
    const shot04Path = path.join(screenshotsDir, '04_thermal_receipt_80mm_preview.png');
    await page.screenshot({ path: shot04Path, fullPage: false });

    // Switch to 58mm compact layout
    const btn58mm = page.locator('[data-testid="paper-width-58mm"]');
    await expect(btn58mm).toBeVisible();
    await btn58mm.click();
    await page.waitForTimeout(500);

    // Capture 05: 58mm thermal receipt preview
    const shot05Path = path.join(screenshotsDir, '05_thermal_receipt_58mm_preview.png');
    await page.screenshot({ path: shot05Path, fullPage: false });

    // Close receipt modal
    await page.locator('[data-testid="close-thermal-modal-btn"]').click();
    await expect(page.locator('[data-testid="thermal-receipt-modal"]')).toBeHidden({ timeout: 5000 });

    // 8. Payment History & Reprint Receipt Action
    // Refresh page / query
    await page.evaluate(() => {
      window.location.hash = '#/finance';
    });
    await page.waitForTimeout(1000);

    const reprintBtn = page.locator('.thermal-receipt-btn').first();
    await expect(reprintBtn).toBeVisible({ timeout: 5000 });

    // Capture 06: Payment History with Reprint action button
    const shot06Path = path.join(screenshotsDir, '06_payment_history_reprint_action.png');
    await page.screenshot({ path: shot06Path, fullPage: false });

    // Click Reprint
    await reprintBtn.click();
    await page.waitForTimeout(800);

    // Capture 07: Reprint modal (authoritative receipt number preserved)
    const shot07Path = path.join(screenshotsDir, '07_reprint_receipt_modal.png');
    await page.screenshot({ path: shot07Path, fullPage: false });

    // Close reprint modal
    await page.locator('[data-testid="close-thermal-modal-btn"]').click();
    await expect(page.locator('[data-testid="thermal-receipt-modal"]')).toBeHidden({ timeout: 5000 });

    // 9. ESC/POS Deterministic Proof via IPC
    const escposProof = await page.evaluate(async (studentId: string) => {
      const payments = await window.tibyan.finance.listStudentPayments(studentId);
      const payment = payments.data?.[0];
      if (!payment) {
        throw new Error('No payment found for ESC/POS test');
      }

      const receiptRes = await window.tibyan.thermal.getReceiptData(payment.id);
      if (!receiptRes.success || !receiptRes.data) {
        throw new Error('Failed to get authoritative receipt data');
      }

      const esc80 = await window.tibyan.thermal.generateEscpos({
        receipt: receiptRes.data,
        paperWidth: '80mm',
        autoCut: true,
      });

      const esc58 = await window.tibyan.thermal.generateEscpos({
        receipt: receiptRes.data,
        paperWidth: '58mm',
        autoCut: false,
      });

      return {
        paymentId: payment.id,
        receiptNumber: receiptRes.data.receiptNumber,
        studentName: receiptRes.data.studentName,
        amountFormatted: receiptRes.data.amountFormatted,
        esc80ByteLength: esc80.data?.byteLength,
        esc80Base64Snippet: esc80.data?.base64?.slice(0, 80),
        esc58ByteLength: esc58.data?.byteLength,
        esc58Base64Snippet: esc58.data?.base64?.slice(0, 80),
      };
    }, seedResult.student.id);

    expect(escposProof.esc80ByteLength).toBeGreaterThan(50);
    expect(escposProof.esc58ByteLength).toBeGreaterThan(50);
    expect(escposProof.receiptNumber).toMatch(/^REC-/);

    const proofPath = path.join(screenshotsDir, 'escpos-deterministic-proof.json');
    fs.writeFileSync(proofPath, JSON.stringify(escposProof, null, 2), 'utf-8');
  });
});
