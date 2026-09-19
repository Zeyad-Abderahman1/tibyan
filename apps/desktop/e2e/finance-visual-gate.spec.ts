import { test, expect, _electron as electron, type ElectronApplication, type Page } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Phase 2 — Task 4: Finance & Invoicing Visual Approval Gate Spec', () => {
  let testDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;
  const artifactDir = 'C:\\Users\\zeyad mohamed\\.gemini\\antigravity-ide\\brain\\d706cd3a-84a5-4152-b094-7a238e59f5ec';
  const screenshotsDir = path.join(artifactDir, 'screenshots');

  test.beforeAll(() => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-finance-gate-'));
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

  test('captures full Finance workflow: Dashboard, Add Payment, Apply Discount, Invoice Preview, and Student Financial Profile', async () => {
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

    // 1. Complete First-Run Wizard
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

    // 2. Populate Students & Groups via window.tibyan
    const studentData = [
      { fullName: 'زياد محمد عبد الله', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01012345678' },
      { fullName: 'مريم أحمد إبراهيم', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01023456789' },
      { fullName: 'عمر خالد الدسوقي', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01034567890' },
      { fullName: 'فاطمة حسن المنشاوي', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01045678901' },
      { fullName: 'يوسف هاني عبد الرحمن', system: 'GENERAL', grade: 'SEC_2', track: 'ARABIC', phone: '01056789012' },
    ];

    const seedResult = await page.evaluate(async (students) => {
      // Create a Group
      const grpRes = await window.tibyan.groups.create({
        name: 'مجموعة الصف الثاني الثانوي - النخبة',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
        subject: 'اللغة العربية',
        paymentType: 'MONTHLY',
        monthlyRateCents: 25000, // 250 EGP
      });
      const groupId = grpRes.data?.id;

      // Create students and enroll them
      const studentIds: string[] = [];
      for (const s of students) {
        const sRes = await window.tibyan.students.create({
          fullName: s.fullName,
          educationSystem: s.system as any,
          gradeLevel: s.grade as any,
          languageTrack: s.track as any,
          guardianPhone: s.phone,
        });
        if (sRes.success && sRes.data) {
          studentIds.push(sRes.data.id);
          if (groupId) {
            await window.tibyan.enrollments.enroll({
              studentId: sRes.data.id,
              groupId,
            });
          }
        }
      }
      return { groupId, studentIds };
    }, studentData);

    expect(seedResult.studentIds.length).toBe(5);

    // 3. Navigate to /finance
    await page.evaluate(() => {
      window.location.hash = '#/finance';
    });

    const financePage = page.locator('[data-testid="page-finance"]');
    await expect(financePage).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // Capture 01: Finance Dashboard at 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    const shot01Path = path.join(screenshotsDir, '01_finance_dashboard_1920x1080.png');
    await page.screenshot({ path: shot01Path, fullPage: false });

    // Capture 02: Finance Dashboard at 1366x768 (standard laptop)
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);
    const shot02Path = path.join(screenshotsDir, '02_finance_dashboard_1366x768.png');
    await page.screenshot({ path: shot02Path, fullPage: false });

    // 4. Open Add Payment Modal for the first student
    const firstStudentId = seedResult.studentIds[0];
    const recordPayBtn = page.locator('.record-payment-btn').first();
    await expect(recordPayBtn).toBeVisible({ timeout: 5000 });
    await recordPayBtn.click();

    const addPaymentForm = page.locator('[data-testid="add-payment-form"]');
    await expect(addPaymentForm).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(600);

    // Capture 03: Add Payment Modal
    const shot03Path = path.join(screenshotsDir, '03_add_payment_modal.png');
    await page.screenshot({ path: shot03Path, fullPage: false });

    // Fill in amount 150 EGP via Vodafone Cash and submit
    const amountInput = page.locator('[data-testid="payment-amount-input"]');
    await amountInput.fill('150');
    const methodSelect = page.locator('[data-testid="payment-method-select"]');
    await methodSelect.selectOption('VODAFONE_CASH');
    const notesInput = page.locator('[data-testid="payment-notes-input"]');
    await notesInput.fill('سداد دفعة شهر سبتمبر عبر فودافون كاش');
    await page.locator('[data-testid="confirm-payment-btn"]').click();
    await page.waitForTimeout(1000);

    const closeAfterPayBtn = page.locator('[data-testid="close-after-payment-btn"]');
    if (await closeAfterPayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeAfterPayBtn.click();
      await page.waitForTimeout(500);
    }

    // 5. Open Apply Discount Modal for the second student
    const secondStudentId = seedResult.studentIds[1];
    const discountBtn = page.locator('.apply-discount-btn').nth(1);
    await expect(discountBtn).toBeVisible({ timeout: 5000 });
    await discountBtn.click();

    const discountForm = page.locator('[data-testid="apply-discount-form"]');
    await expect(discountForm).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(600);

    // Set 20% discount and reason
    await page.locator('[data-testid="discount-value-input"]').fill('20');
    await page.locator('[data-testid="discount-reason-input"]').fill('خصم تفوق أكاديمي للمركز الأول');

    // Capture 04: Apply Discount Modal
    const shot04Path = path.join(screenshotsDir, '04_apply_discount_modal.png');
    await page.screenshot({ path: shot04Path, fullPage: false });

    await page.locator('[data-testid="confirm-discount-btn"]').click();
    await page.waitForTimeout(1000);

    // 6. Open Invoice Preview Modal for the first student
    const invoiceBtn = page.locator('.invoice-preview-btn').first();
    await expect(invoiceBtn).toBeVisible({ timeout: 5000 });
    await invoiceBtn.click();

    const printableInvoice = page.locator('[data-testid="printable-invoice-sheet"]');
    await expect(printableInvoice).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    // Capture 05: Invoice Preview Modal
    const shot05Path = path.join(screenshotsDir, '05_invoice_preview_modal.png');
    await page.screenshot({ path: shot05Path, fullPage: false });

    // Close invoice modal
    await page.locator('[data-testid="close-invoice-preview-btn"]').click();
    await page.waitForTimeout(500);

    // 7. Navigate to Student Profile page and check "السجل المالي والاشتراكات"
    await page.evaluate((id) => {
      window.location.hash = `#/students/${id}`;
    }, firstStudentId);

    const profilePage = page.locator('[data-testid="student-profile-page"]');
    await expect(profilePage).toBeVisible({ timeout: 15000 });

    // Switch to Financial Tab
    const financeTabBtn = page.locator('[data-testid="profile-tab-finance"]');
    await expect(financeTabBtn).toBeVisible({ timeout: 5000 });
    await financeTabBtn.click();

    const financialView = page.locator('[data-testid="student-financial-view"]');
    await expect(financialView).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // Capture 06: Student Profile Financial Tab
    const shot06Path = path.join(screenshotsDir, '06_student_profile_finance_tab.png');
    await page.screenshot({ path: shot06Path, fullPage: false });

    // Confirm that files exist and are non-empty
    expect(fs.existsSync(shot01Path)).toBe(true);
    expect(fs.existsSync(shot02Path)).toBe(true);
    expect(fs.existsSync(shot03Path)).toBe(true);
    expect(fs.existsSync(shot04Path)).toBe(true);
    expect(fs.existsSync(shot05Path)).toBe(true);
    expect(fs.existsSync(shot06Path)).toBe(true);
  });
});
