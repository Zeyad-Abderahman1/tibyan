import { test, expect, _electron as electron } from 'playwright/test';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const executablePath = path.resolve(root, '../release/win-unpacked/تِبيان.exe');
const fixturePassword = crypto.randomBytes(24).toString('hex');
const fixtureKey = `${crypto.randomBytes(24).toString('hex')}ABCD`;
const replacementKey = `${crypto.randomBytes(24).toString('hex')}WXYZ`;

test('packaged AI settings require owner password and preserve encrypted key across restart', async () => {
  test.setTimeout(120_000);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-ai-settings-'));
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

    const db = new Database(path.join(dataDir, 'data', 'system', 'tibyan-system.sqlite'));
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(fixturePassword, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
    db.prepare('INSERT INTO global_settings(key,value_json,updated_at) VALUES (?,?,?)').run('ai.ownerPasswordHash', `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`, new Date().toISOString());
    db.close();

    app = await launch(); page = await app.firstWindow();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
    for (const digit of '1234') await page.getByRole('button', { name: digit, exact: true }).click();
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });
    await page.locator('a[href="#/settings"]').first().click();
    await page.locator('[data-testid="settings-tab-ai"]').click();
    await expect(page.locator('[data-testid="ai-settings"]')).toContainText('غير مفعلة');
    await page.locator('[data-testid="ai-set-key"]').click();
    await page.locator('[data-testid="ai-key-input"]').fill(fixtureKey);
    await page.locator('[data-testid="ai-owner-password"]').fill('wrong-password');
    await page.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
    await expect(page.getByRole('status')).toContainText('كلمة المرور غير صحيحة');
    await expect(page.locator('[data-testid="ai-settings"]')).toContainText('غير مفعلة');
    await page.locator('[data-testid="ai-key-input"]').fill(fixtureKey);
    await page.locator('[data-testid="ai-owner-password"]').fill(fixturePassword);
    await page.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
    await expect(page.locator('[data-testid="ai-masked-key"]')).toHaveText('****ABCD');
    await expect(page.locator('[data-testid="ai-settings"]')).not.toContainText(fixtureKey);
    await page.locator('[data-testid="ai-set-key"]').click();
    await page.locator('[data-testid="ai-key-input"]').fill(replacementKey);
    await page.locator('[data-testid="ai-owner-password"]').fill('wrong-password');
    await page.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
    await expect(page.locator('[data-testid="ai-masked-key"]')).toHaveText('****ABCD');
    await page.locator('[data-testid="ai-key-input"]').fill(replacementKey);
    await page.locator('[data-testid="ai-owner-password"]').fill(fixturePassword);
    await page.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
    await expect(page.locator('[data-testid="ai-masked-key"]')).toHaveText('****WXYZ');
    await app.close();

    const saved = new Database(path.join(dataDir, 'data', 'system', 'tibyan-system.sqlite'), { readonly: true });
    const row = saved.prepare('SELECT value_json FROM global_settings WHERE key=?').get('ai.gemini.credential') as { value_json: string };
    expect(row.value_json).not.toContain(fixtureKey);
    expect(row.value_json).not.toContain(replacementKey);
    saved.close();

    app = await launch(); page = await app.firstWindow();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
    for (const digit of '1234') await page.getByRole('button', { name: digit, exact: true }).click();
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });
    await page.locator('a[href="#/settings"]').first().click();
    await page.locator('[data-testid="settings-tab-ai"]').click();
    await expect(page.locator('[data-testid="ai-masked-key"]')).toHaveText('****WXYZ');
    await page.locator('[data-testid="ai-test-connection"]').click();
    await expect(page.getByRole('status')).toContainText('تعذر الاتصال', { timeout: 25000 });
    await page.locator('[data-testid="ai-delete-key"]').click();
    await page.locator('[data-testid="ai-owner-password"]').fill('wrong-password');
    await page.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
    await expect(page.getByRole('status')).toContainText('كلمة المرور غير صحيحة');
    await expect(page.locator('[data-testid="ai-masked-key"]')).toHaveText('****WXYZ');
    await page.locator('[data-testid="ai-owner-password"]').fill(fixturePassword);
    await page.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
    await expect(page.locator('[data-testid="ai-settings"]')).toContainText('غير مفعلة');
  } finally {
    await app.close().catch(() => {});
    if (!path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe cleanup path');
    try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* Windows may hold a process handle briefly. */ }
  }
});
