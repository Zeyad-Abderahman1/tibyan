import { test, expect, _electron as electron } from 'playwright/test';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const executablePath = path.resolve(root, '../release/win-unpacked/تِبيان.exe');

test('packaged app saves and reopens Review and Notes artifacts after restart', async () => {
  test.setTimeout(90000);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-study-reopen-'));
  const launch = () => electron.launch({ executablePath, args: [`--user-data-dir=${dataDir}`], env: {...process.env, TIBYAN_APP_DATA_DIR: dataDir} });
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
    const login = page.locator('[data-testid="login-screen"]');
    const shell = page.locator('[data-testid="app-shell"]');
    await Promise.race([
      finish.waitFor({state:'visible',timeout:15000}).catch(() => {}),
      login.waitFor({state:'visible',timeout:15000}).catch(() => {}),
      shell.waitFor({state:'visible',timeout:15000}).catch(() => {}),
    ]);
    if (await finish.isVisible()) await finish.click();
    if (await page.locator('[data-testid="login-screen"]').isVisible()) await page.keyboard.type('1234');
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
    await app.close();

    const db = new Database(path.join(dataDir, 'data', 'academic-years', 'tibyan-2026-2027.sqlite'));
    const now = new Date().toISOString();
    const source = crypto.randomUUID(), reviewId = crypto.randomUUID(), notesId = crypto.randomUUID();
    db.prepare('INSERT INTO review_artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(reviewId, source, 'مراجعة محفوظة', 'QUESTIONS', 'MODERATE', null, 1, 1, JSON.stringify({sections:[{title:'سؤال',content:'احسب القوة',type:'question',sourcePage:1,modelAnswer:'F=ma'}]}), now, now);
    db.prepare('INSERT INTO notes_artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(notesId, source, 'مذكرة محفوظة', 'SEC_2', null, 'MODERATE', 0, 0, JSON.stringify({sections:[{title:'شرح',content:'القوة تساوي الكتلة في التسارع',type:'content',sourcePage:1}]}), now, now);
    db.close();

    app = await launch(); page = await app.firstWindow();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({timeout:15000});
    await page.waitForTimeout(500);
    await page.keyboard.type('1234');
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({timeout:15000});
    const saved = await page.evaluate(async ({reviewId, notesId}) => {
      const bridge = (window as any).tibyan.ai;
      const reviews = await bridge.listReviews(), notes = await bridge.listNotes();
      const review = await bridge.saveReview(reviewId, {sections:[{title:'سؤال معدل',content:'احسب القوة',type:'question',sourcePage:1,modelAnswer:'F=ma'}]});
      const note = await bridge.saveNotes(notesId, {sections:[{title:'شرح معدل',content:'القوة تساوي الكتلة في التسارع',type:'content',sourcePage:1}]});
      return {reviews, notes, review, note};
    }, {reviewId, notesId});
    expect(saved.reviews.success).toBe(true);
    expect(saved.notes.success).toBe(true);
    expect(saved.reviews.data).toHaveLength(1);
    expect(saved.notes.data).toHaveLength(1);
    expect(saved.review.success).toBe(true);
    expect(saved.note.success).toBe(true);
    await app.close();

    app = await launch(); page = await app.firstWindow();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({timeout:15000});
    await page.waitForTimeout(500);
    await page.keyboard.type('1234');
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({timeout:15000});
    const reopened = await page.evaluate(async ({reviewId, notesId}) => ({
      review: await (window as any).tibyan.ai.getReview(reviewId),
      notes: await (window as any).tibyan.ai.getNotes(notesId),
    }), {reviewId, notesId});
    expect(reopened.review.success).toBe(true);
    expect(reopened.notes.success).toBe(true);
    expect(reopened.review.data.content.sections[0].title).toBe('سؤال معدل');
    expect(reopened.notes.data.content.sections[0].title).toBe('شرح معدل');
  } finally {
    await app.close().catch(() => {});
    if (!path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe cleanup path');
    try { fs.rmSync(dataDir, {recursive:true,force:true,maxRetries:5,retryDelay:200}); } catch { /* Windows may still hold a process handle briefly. */ }
  }
});
