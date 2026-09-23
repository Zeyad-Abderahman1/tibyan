import { test, expect, _electron as electron } from 'playwright/test';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

test.skip(process.env.TIBYAN_VERIFY_CONFIGURED_AI_KEY !== '1', 'Requires a locally configured key; never uses a key from source code.');

const root = path.dirname(fileURLToPath(import.meta.url));
const executablePath = path.resolve(root, '../release/win-unpacked/تِبيان.exe');

function readablePdf(): Buffer {
  const stream = 'BT /F1 12 Tf 50 740 Td (Force equals mass times acceleration. Example: 2 kg times 3 m/s2 equals 6 N.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

test('packaged app tests configured key and generates one source-backed Review with the shared model', async () => {
  test.setTimeout(240_000);
  const originalDb = path.join(process.env.APPDATA!, '@tibyan', 'desktop', 'data', 'system', 'tibyan-system.sqlite');
  const originalLocalState = path.join(process.env.APPDATA!, '@tibyan', 'desktop', 'Local State');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-live-model-'));
  let originalCipherHash: string | undefined;
  const launch = () => electron.launch({ executablePath, args: [`--user-data-dir=${dataDir}`], env: { ...process.env, TIBYAN_APP_DATA_DIR: dataDir } });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    await page.locator('[data-testid="start-wizard-btn"]').click();
    await page.locator('[data-testid="input-owner-fullname"]').fill('معلم الاختبار');
    await page.locator('[data-testid="input-owner-username"]').fill('teacher');
    await page.locator('[data-testid="input-owner-pin"]').fill('1234');
    await page.locator('[data-testid="input-owner-confirm-pin"]').fill('1234');
    await page.locator('[data-testid="submit-owner-btn"]').click();
    await page.locator('[data-testid="submit-year-btn"]').click();
    const finish = page.locator('[data-testid="finish-wizard-btn"]');
    await Promise.race([finish.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}), page.locator('[data-testid="login-screen"]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})]);
    if (await finish.isVisible()) await finish.click();
    if (await page.locator('[data-testid="login-screen"]').isVisible()) for (const digit of '1234') await page.getByRole('button', { name: digit, exact: true }).click();
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });
    await app.close();
    // Electron safeStorage uses the OS-protected profile key in Local State.
    // Copy only into this disposable profile; never print or decode either secret.
    fs.copyFileSync(originalLocalState, path.join(dataDir, 'Local State'));

    const sourceDb = new Database(originalDb, { readonly: true });
    const encrypted = sourceDb.prepare('SELECT value_json FROM global_settings WHERE key=?').get('ai.gemini.credential') as { value_json: string } | undefined;
    sourceDb.close();
    expect(encrypted?.value_json).toBeTruthy();
    originalCipherHash = crypto.createHash('sha256').update(encrypted!.value_json).digest('hex');
    const testDb = new Database(path.join(dataDir, 'data', 'system', 'tibyan-system.sqlite'));
    testDb.prepare('INSERT INTO global_settings(key,value_json,updated_at) VALUES (?,?,?)').run('ai.gemini.credential', encrypted!.value_json, new Date().toISOString());
    testDb.close();

    app = await launch(); page = await app.firstWindow();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 15000 });
    for (const digit of '1234') await page.getByRole('button', { name: digit, exact: true }).click();
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });
    await page.locator('a[href="#/settings"]').first().click();
    await page.locator('[data-testid="settings-tab-ai"]').click();
    await expect(page.locator('[data-testid="ai-masked-key"]')).toBeVisible();
    await app.evaluate(() => {
      (globalThis as any).__aiDiagnostics = [];
      const prior = console.warn;
      console.warn = (...args: unknown[]) => {
        if (args[0] === '[Tibyan AI connection]') (globalThis as any).__aiDiagnostics.push(args[1]);
        prior(...args);
      };
    });
    await page.locator('[data-testid="ai-test-connection"]').click();
    const feedback = page.getByRole('status');
    await expect(feedback).toBeVisible({ timeout: 90_000 });
    const feedbackText = await feedback.innerText();
    const diagnostics = await app.evaluate(() => (globalThis as any).__aiDiagnostics as unknown[]);
    const connectionPassed = feedbackText.includes('تم الاتصال بخدمة تِبيان بنجاح.');
    console.log(`LIVE_SETTINGS_CONNECTION=${connectionPassed ? 'PASS' : 'FAIL'}`, JSON.stringify(diagnostics));

    const pdfPath = path.join(dataDir, 'readable-physics.pdf');
    fs.writeFileSync(pdfPath, readablePdf());
    const imported = await page.evaluate(async (sourceFilePath) => (window as any).tibyan.curriculumLibrary.import({ sourceFilePath, title: 'Physics source', gradeLevel: 'SEC_1', subject: 'فيزياء' }), pdfPath);
    expect(imported.success).toBe(true);
    const generated = await page.evaluate(async (sourceDocumentId) => (window as any).tibyan.ai.generateReview({ sourceDocumentId, title: 'مراجعة القوة', reviewType: 'EXPLANATION', detailLevel: 'BRIEF', questionCount: 0, includeModelAnswers: false }), imported.data.id);
    console.log(`LIVE_REVIEW_GENERATION=${generated.success ? 'PASS' : 'FAIL'}`, generated.success ? '' : generated.error?.code);
    expect(connectionPassed, JSON.stringify(diagnostics)).toBe(true);
    expect(generated.success).toBe(true);
    expect(generated.data.content.sections.length).toBeGreaterThan(0);
  } finally {
    await app.close().catch(() => {});
    if (originalCipherHash) {
      const original = new Database(originalDb, { readonly: true });
      const current = original.prepare('SELECT value_json FROM global_settings WHERE key=?').get('ai.gemini.credential') as { value_json: string };
      original.close();
      expect(crypto.createHash('sha256').update(current.value_json).digest('hex')).toBe(originalCipherHash);
    }
    if (!path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe cleanup path');
    try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* Windows may hold a process handle briefly. */ }
  }
});
